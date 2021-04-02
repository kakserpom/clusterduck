const ClusterNode = require('./cluster_node')
const Balancer = require('./balancer')
const Collection = require('../misc/collection')
const HealthCheck = require('./health_check');
const UpdateNode = require('./commands/update-node')
const ClusterNodes = require('./collections/cluster_nodes')
const Entity = require('../misc/entity')
const Majority = require('../misc/majority')
const SetClusterState = require('./commands/set-cluster-state')
const Commit = require('./commit')
const deepCopy = require('deep-copy')
const EmitEvent = require('./commands/emit-event')
const {quote} = require('shell-quote')
const parseDuration = require('parse-duration')
const DeleteNode = require('./commands/delete-node')

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

        this._nodes_starting = 0
        this._spare_nodes_starting = 0

        this.name = config.name
        this.debug = require('diagnostics')('cluster.' + this.name)
        this.debugDeep = require('diagnostics')('cluster-deep.' + this.name)
        this.clusterduck = clusterduck
        this.set_config(config)
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
     * @param key
     * @param withState
     * @returns {*|boolean}
     * @private
     */
    _exportable(key, withState) {
        return super._exportable(key, withState)
            && key !== 'clusterduck'
            && key !== 'config'
            && key !== 'name'
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

        const nodes_active = this.nodes.filter(node => node.active || !node.checked).length

        let nodes_spare_count = this.nodes.filter(node => node.available && node.spare).length

        let nodes_active_deficit = (this.config.min_active_nodes || 0) - nodes_active - this._nodes_starting

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

        let nodes_spare_deficit = (this.config.min_spare_nodes || 0) - nodes_spare_count - this._spare_nodes_starting

        if (nodes_active_deficit <= 0 && nodes_spare_deficit <= 0) {
            return true
        }

        const capacity = await this.get_capacity(3e3)

        this.debug('capacity:', capacity)
        for (const duck of capacity) {
            const start = params => {
                params = params || {}
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
                ++this._nodes_starting
                setTimeout(() => --this._nodes_starting, 5e3)
                start()
                --nodes_active_deficit
            }

            while (nodes_spare_deficit > 0) {
                if ((duck.info.capacity || 0) <= 0) {
                    break
                }
                --duck.info.capacity
                ++this._spare_nodes_starting
                setTimeout(() => --this._spare_nodes_starting, 5e3)
                start({spare: true})
                --nodes_spare_deficit
            }
        }

        const deficit = nodes_active_deficit + nodes_spare_deficit
        if (deficit > 0) {
            this.debug('cluster capacity deficit: ', deficit)
            return false
        } else {
            return true
        }
    }

    /**
     * Called whenever the config is loaded/updated
     * @param config
     */
    set_config(config) {
        this.config = config


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
                this.debug('state = ' + state)
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
            const [prop, event] = trigger.on
            this[prop].on(event, (...args) => {
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
            });
        })

        this.nodes
            .on('inserted', node => {
                node
                    .on('changed_shared_state', node => {
                        if (raft && !raft.isLeader() && !raft.isCandidate()) {
                            // We are a non-leader instance, let the leader handle this
                            return
                        }

                        let tsThreshold = Date.now() - this.shared_state_timeout
                        let available = new Majority()
                        Object.values(node.shared_state).forEach(opinion => {
                            if (opinion.ts < tsThreshold) {
                                return
                            }
                            available.feed(opinion.available)
                        })

                        this.clusterduck.commit([
                            (new UpdateNode).target(node).attr({
                                available: available.value(false),
                                checked: true
                            })
                        ])
                    })
                    .on('changed', (node, state) => this.nodes.emit('changed', node, state))


                    .on('passed', node => {
                        this.clusterduck.commit([
                            (new UpdateNode).target(node).setSharedState(this.clusterduck.id, {
                                available: true,
                                checked: true,
                            })
                        ])
                    })
                    .on('failed', (node, error) => {
                        this.clusterduck.commit([
                            (new UpdateNode).target(node).setSharedState(this.clusterduck.id, {
                                available: false,
                                checked: true,
                            })
                        ])
                    })

                this.debug(`${this.name}: INSERTED NODE: `, node.export())
                this.nodes.emit('changed', node, node.state)

            })
            .on('deleted', node => {
                this.debug(`${this.name}: DELETED NODE: `, node.export())
                this.nodes.emit('changed', node, false)
            })
            .on('changed', (node, state) => {
                this.debug('nodes.changed: %s', node.addr, state)
            })
            .on('all', () => {
                this.config.nodes = this.nodes.map(node => node.export())
                this.clusterduck.emit('config:changed')
            })
            .addFromArray(this.config.nodes || [])

        setTimeout(() => {
            setImmediate((async () => {
                let changed = false
                let finished = false
                this.nodes.on('all', () => {
                    changed = true
                })
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
                            console.error(e)
                            finished = false
                        }
                    }
                    if (!changed) {
                        await this.nodes.waitFor('all', {timeout: 10e3}).catch(e => {
                        })
                    }
                }
            }))

        }, 5e3)

        this.nodesHealthChecks = new Map()

        this.balancers = new Collection('name', config => Balancer.factory(config, this))
        this.balancers.addFromObject(this.config.balancers || {})

        this.balancers.forEach(balancer => balancer.start())

        process.on('exit', () => this.balancers.forEach(balancer => balancer.stop()))

        this.health_checks = new Collection('id')
        this.health_checks.addFromArray(this.config.health_checks || [])

    }

    /**
     *
     * @param type
     * @returns {*}
     */
    health_check(node, config) {
        const key = node.addr + '__' + config.id;
        let hc = this.nodesHealthChecks.get(key)
        if (!hc) {
            hc = new HealthCheck(node, config, this.__dirname + '/health_checks/' + config.type + '.js')
            hc.cluster = this
            this.nodesHealthChecks.set(key, hc)
        }

        return hc
    }

    /**
     * Run health checks on the cluster
     */
    run_health_checks() {

        let clusterChecks = []

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

            const allNodeChecks = Promise.all(nodeChecks)
                .then(list => node.emit('passed', node))
                .catch(error => node.emit('failed', node, error))
            clusterChecks.push(allNodeChecks)
        })

        Promise.all(clusterChecks).then(list => {

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

return module.exports = Cluster
