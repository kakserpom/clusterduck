const ClusterNode = require('./cluster_node')
const Balancer = require('./balancer')
const Collection = require('../misc/collection')
const HealthCheck = require('./health_check');
const UpdateNode = require('./commands/update-node')
const ClusterNodes = require('./collections/cluster_nodes')
const Entity = require('../misc/entity')
const Majority = require('majority')
const SetClusterState = require('./commands/set-cluster-state')
const Commit = require('./commit')
const deepCopy = require('deep-copy')
const EmitEvent = require('./commands/emit-event')
const {quote} = require('shell-quote')
const parseDuration = require('parse-duration')
const DeleteNode = require('./commands/delete-node')
const {v4: uuidv4} = require('uuid')
const throttleCallback = require('throttle-callback')
const dotProp = require("../misc/dot-prop")

/**
 * Cluster model
 *
 * @abstract
 * @event node:changed
 * @event node:passed
 * @event node:failed
 */
class Cluster extends Entity {

    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor(config, clusterduck) {
        super()

        this._starting_nodes = new Map()
        this.name = config.name
        this.debug = require('diagnostics')('cluster:' + this.name)
        this.debugDeep = require('diagnostics')('cluster-deep:' + this.name)
        this.clusterduck = clusterduck
        this.set_config(config)
    }

    /**
     *
     * @param key
     * @param withState
     * @returns {*|boolean}
     * @private
     */
    _exportable(key, withState) {
        if (!['clusterduck', 'debug', 'debugDeep'].includes(key)) {
            return super._exportable(key, withState)
        }
    }


    /**
     *
     * @returns {(string|*)[]}
     */
    path() {
        return ['clusters', this.name]
    }

    /**
     *
     * @param timeout
     * @returns {Promise<unknown>}
     */
    async get_capacity(timeout) {
        const totalNodes = this.clusterduck.totalNodes()
        this.debugDeep('totalNodes ', totalNodes)
        return new Promise((resolve, reject) => {
            let ducks = []

            let timer
            let ids = []
            const handler = (id, info) => {
                if (ids.includes(id)) {
                    return
                }
                ids.push(id)
                if (info) {
                    ducks.push({id, info})
                }
                if (ids.length >= totalNodes) {
                    this.debugDeep('clearing timeout')
                    clearTimeout(timer)
                    ret()
                }
            }
            const ev = 'rep:start-capacity'
            const ret = () => {
                this.nodes.off(ev, handler)
                resolve(ducks.sort((a, b) => a.info.load - b.info.load))
            }
            timer = setTimeout(ret, timeout)
            this.nodes.on(ev, handler)

            this.clusterduck.commit([
                (new EmitEvent).target(this.nodes).define('req:start-capacity')
            ])
        })
    }

    purge_unavailable(timeout) {

        /**
         *
         * @type RaftTransport
         */
        const raft = this.clusterduck.transports.get('raft')

        if (raft && raft.isFollower()) {
            return
        }

        const threshold = Date.now() - timeout
        this.nodes.forEach(node => {
            if (!node.available && node.checked && (node.available_changed < threshold)) {
                this.debug('Purging unavailable node: ', node.addr)
                this.clusterduck.commit([
                    (new DeleteNode).target(node)
                ])
            }
        })
    }

    /**
     *
     * @returns {Promise<boolean>}
     */
    async check_nodes_limits() {

        this.debugDeep('check_nodes_limits()')
        /**
         *
         * @type RaftTransport
         */
        const raft = this.clusterduck.transports.get('raft')

        if (raft) {
            if (raft.isFollower()) {
                return true
            }
            if (!raft.isLeaderOrLongCandidate()) {
                return false
            }
        }

        // Active nodes

        const nodes_active = this.nodes.count(node =>
            node.active || (!node.checked && !node.disabled && !node.spare)
        )


        const countStarting = spare => {
            let count = 0
            this._starting_nodes.forEach(node => {
                if ((spare && node.spare) || (!spare && !node.spare)) {
                    ++count
                }
            })
            return count
        }

        const nodes_starting = countStarting(false)

        let nodes_active_deficit = (this.config.min_active_nodes || 0) - nodes_active - nodes_starting

        let nodes_spare_count = this.nodes.count(node => node.spare && !node.disabled && (node.available || !node.checked))

        while (nodes_active_deficit > 0) {
            const spare = nodes_spare_count > 0 ? this.nodes.one(node => node.available && node.spare) : false
            if (!spare) {
                break
            }
            this.debug('activating a spare node: ' + spare.addr)
            this.clusterduck.commit([
                (new UpdateNode).target(spare).attr({spare: false})
            ])

            --nodes_active_deficit
            --nodes_spare_count
        }

        const nodes_spare_starting = countStarting(true)

        let nodes_spare_deficit = (this.config.min_spare_nodes || 0) - nodes_spare_count - nodes_spare_starting

        if (nodes_active_deficit <= 0 && nodes_spare_deficit <= 0) {
            return true
        }

        const capacity = await this.get_capacity(3e3)
        this.debug('capacity:', capacity)
        for (const duck of capacity) {
            const start = params => {
                params = params || {}

                const cookie = uuidv4()

                this._starting_nodes.set(cookie, params)
                setTimeout(() => this._starting_nodes.delete(cookie), this.config.starting_timeout || 5e3)

                params = {...params, start_cookie: cookie}

                const commit = new Commit([
                    (new EmitEvent).target(this.nodes).define('start', params)
                ])
                if (duck.id === this.clusterduck.id) {
                    this.debug('starting a node here with params', params)
                    commit.execute(this.clusterduck)
                } else if (raft) {
                    this.debug('starting a node on ', duck.id, 'with params', params)
                    raft.messageChild(duck.id, 'commit', commit.bundle())
                } else {
                    this.debug('cannot start a node, bad duck.id', duck.id)
                }
            }

            while (nodes_active_deficit > 0) {
                if ((duck.info.capacity || 0) <= 0) {
                    break
                }
                --duck.info.capacity
                start()
                --nodes_active_deficit
            }

            while (nodes_spare_deficit > 0) {
                if ((duck.info.capacity || 0) <= 0) {
                    break
                }
                --duck.info.capacity
                start({spare: true})
                --nodes_spare_deficit
            }
        }

        const deficit = nodes_active_deficit + nodes_spare_deficit
        if (deficit > 0) {
            this.debug('cluster capacity deficit: ', deficit)
            return false
        } else {
            return this._starting_nodes.size === 0
        }
    }

    /**
     * Called whenever the config is loaded/updated
     * @param config
     */
    set_config(config) {
        this.config = config

        this.initialized = false

        this.shared_state_timeout = 30e3

        /**
         *
         * @type {ClusterNodes}
         */
        this.nodes = new ClusterNodes('addr', node => {
            if (node.constructor.name === 'ClusterNode') {
                return node
            }
            return new ClusterNode(node, this)
        })
        this.nodes.debug = require('diagnostics')('cluster-nodes:' + this.name)
        this.nodes.debugDeep = require('diagnostics')('cluster-nodes-deep:' + this.name)

        this.nodes.path = () => this.path().concat(['nodes'])
        /**
         *
         * @type RaftTransport
         */
        const raft = this.clusterduck.transports.get('raft')

        if (raft) {
            raft.on('leader', () => this.nodes.forEach(node => node.emit('changed_shared_state', node)))
            raft.on('candidate', () => this.nodes.forEach(node => node.emit('changed_shared_state', node)))

            raft.on('state', state => {
                this.debug('Raft state:', state)
                this.acceptCommits = ['LEADER', 'CANDIDATE'].includes(state)
            })

            raft.on('new-follower', follower => {
                this.debug('new follower: ', follower, ', sending ' + this.nodes.length + ' nodes')
                const commit = new Commit([
                    (new SetClusterState).target(this).addNodesFromCollection(this.nodes)
                ])
                raft.messageChild(follower, 'commit', commit.bundle())
            })
        } else {
            this.acceptCommits = true
        }

        this.nodes.on('req:*', () => {

            const ev = this.nodes.event.substr(4)

            const sendBack = (...args) => {
                const commit = new Commit([
                    (new EmitEvent).target(this.nodes).define('rep:' + ev, this.clusterduck.id, ...args)
                ])
                if (raft) {
                    if (raft.isFollower()) {
                        raft.messageLeader('commit', commit.bundle())
                    } else if (raft.isLeader() || raft.isCandidate()) {
                        commit.execute(this.clusterduck)
                    }
                } else {
                    commit.execute(this.clusterduck)
                }
            }

            if (this.nodes.listenerCount(ev)) {
                this.nodes.emit(ev, (...args) => sendBack(...args))
            } else {
                sendBack()
            }
        })

        this.triggers = new Collection('id')
        this.triggers.addFromArray(this.config.triggers || [])
        this.triggers.forEach(trigger => {
            if (!Array.isArray(trigger.on)) {
                throw new Error('triggers[].on must be an array: ' + JSON.stringify(trigger))
            }

            const [prop, event] = trigger.on
            const handler = (...args) => {
                if (!this.initialized) {
                    return
                }
                let env = deepCopy(trigger.env || {})

                env.CLUSTER = this.name
                env.CD_OPTS = '-c ' + quote([this.clusterduck.argv.configFile])

                if (prop === 'nodes') {
                    env.nodes_active_addrs = this.nodes.active.map(node => node.addr)
                    env.nodes_active_count = this.nodes.active.length

                    if (event === 'start' && args.length) {
                        env.CD_NODE_PARAMS = args[0]
                    }
                }

                (trigger.do || []).forEach((cfgAction) => {
                    const action = new (require('../actions/' + cfgAction.type))(cfgAction)
                    action.invoke(env, ...args)
                })
            }
            if (trigger.throttle) {
                this[prop].on(event, throttleCallback(handler, parseDuration(trigger.throttle)))
            } else {
                this[prop].on(event, handler)
            }
        })

        this.nodes
            .on('inserted', node => {

                if (!node) {
                    return
                }

                if (node.start_cookie) {
                    if (this._starting_nodes.delete(node.start_cookie)) {
                        this.clusterduck.commit([
                            (new UpdateNode).target(node).deleteAttr('start_cookie')
                        ])
                    }
                }

                node
                    .on('changed_shared_state', throttleCallback(node => {
                        if (raft && !raft.isLeader() && !raft.isCandidate()) {
                            // We are a non-leader instance, let the leader handle this
                            return
                        }

                        const tsThreshold = Date.now() - this.shared_state_timeout
                        const available = new Majority()
                        const errors = new Set()

                        const attrs = {}

                        Object
                            .values(node.shared_state)
                            .sort((a, b) => a.ts - b.ts)
                            .forEach(opinion => {
                                if (opinion.ts < tsThreshold) {
                                    return
                                }

                                for (const [key, value] of Object.entries(opinion.attrs || {})) {
                                    dotProp.set(attrs, key, value)
                                }

                                available.feed(opinion.available)
                                if (opinion.error) {
                                    errors.add(opinion.error)
                                }
                            })

                        this.clusterduck.commit([
                            (new UpdateNode).target(node).attr({
                                available: available.value(false),
                                errors: Array.from(errors),
                                checked: true,
                                attrs
                            })
                        ])
                    }, 100))
                    .on('changed', (node, state) => this.nodes.emit('changed', node, state))
                    .on('passed', () => {
                        const warnings = new Set()
                        const attrs = {}

                        let error = null
                        let available = true
                        node.health_checks.forEach(check => {
                            for (const [key, value] of Object.entries(check.node_attrs || {})) {
                                attrs[key] = value
                            }
                            if (check.error) {
                                available = false
                                error = check.error
                            }
                            (check.warnings || []).forEach(warning => warnings.add(warning))
                        })

                        this.clusterduck.commit([
                            (new UpdateNode).target(node).setSharedState(this.clusterduck.id, {
                                available,
                                error,
                                attrs,
                                warnings: Array.from(warnings),
                                checked: true,
                            })
                        ])
                    })
                    .on('failed', error => {
                        this.debug('health-check failed: ', error)
                        this.clusterduck.commit([
                            (new UpdateNode).target(node).setSharedState(this.clusterduck.id, {
                                available: false,
                                error: error.message,
                                warnings: [],
                                checked: true,
                            })
                        ])
                    })

                this.nodes.debug(`INSERTED: `, node.export())
                this.nodes.emit('changed', node, node.state)

            })
            .on('deleted', node => {
                this.nodes.debug(`DELETED: `, node.export())
                this.nodes.emit('changed', node, false)
            })
            .on('changed', (node, state) => {
                this.nodes.debugDeep('CHANGED %s:', node.addr, state)
            })
            .on('all', throttleCallback(() => {
                this.config.nodes = this.nodes.map(node => node.export())
                this.clusterduck.emit('config:changed')
                if (!this.initialized) {
                    const unchecked = this.nodes.count(node => !node.checked)
                    if (unchecked === 0) {
                        this.initialized = true
                        this.nodes.emit('all')
                    }
                } else {
                    const json = JSON.stringify(this.nodes.active.map(node => node.addr))
                    if (!this.last_active_nodes || this.last_active_nodes !== json) {
                        this.last_active_nodes = json
                        this.nodes.emit('active')
                    }
                }
            }, 0.1e3))
            .addFromArray(this.config.nodes || [])

        setTimeout(() => {
            setImmediate((async () => {
                let changed = false
                let finished = false
                this.nodes.on('all', () => changed = true)
                if (raft) {
                    raft.on('state', () => finished = false)
                }
                const purgeDuration = parseDuration(this.config.purge_unavailable || '0')
                for (; ;) {
                    if (purgeDuration) {
                        this.purge_unavailable(purgeDuration)
                    }

                    if (changed || !finished) {
                        changed = false
                        try {
                            finished = await this.check_nodes_limits()
                        } catch (e) {
                            console.error('Caught exception:', e)
                            finished = false
                        }
                    }
                    if (!changed) {
                        await this.nodes.waitFor('all', {timeout: 10e3}).catch(e => {
                        })
                    } else if (!finished) {
                        await this.nodes.waitFor('all', {timeout: 1e3}).catch(e => {
                        })
                    }
                }
            }))

        }, 5e3)

        this.balancers = new Collection('name', config => Balancer.factory(config, this))
        this.balancers.addFromObject(this.config.balancers || {})

        this.balancers.forEach(balancer => balancer.start())

        process.on('exit', () => this.balancers.forEach(balancer => balancer.stop()))

        this.health_checks = new Collection('id')
        this.health_checks.addFromArray(this.config.health_checks || [])

    }

    /**
     *
     * @returns {*}
     * @param node
     * @param config
     */
    health_check(node, config) {
        let hc = node.health_checks.get(config.id)
        if (!hc) {
            hc = new HealthCheck(node, config, this.__dirname + '/health_checks/' + config.type + '.js')
            node.health_checks.set(config.id, hc)
        }

        return hc
    }

    /**
     * Run health checks on the cluster
     */
    run_health_checks() {
        this.nodes.forEach(node => {
            let nodeChecks = []
            this.health_checks.forEach(hc => {
                const promise = this.health_check(node, hc).triggerIfDue()
                if (promise != null) {
                    nodeChecks.push(promise)
                }
            })

            if (!nodeChecks.length && !this.config.pass_without_checks) {
                return
            }

            Promise.all(nodeChecks)
                .then(list => node.emit('passed', list))
                .catch(error => node.emit('failed', error))
        })
    }
}

Cluster.factory = (config, clusterduck) => {
    const constructor = require(config.type)
    if (typeof constructor !== 'function') {
        throw new Error('Unable to initialize cluster ' + JSON.stringify(config.name)
            + ': module ' + JSON.stringify(config.type) + ' not found')
    }
    return new constructor(config, clusterduck)
}

module.exports = Cluster
