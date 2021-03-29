const ClusterNode = require('./cluster_node')
const Balancer = require('./balancer')
const emitter = require('events').EventEmitter
const Collection = require('../misc/collection')
const HealthCheck = require('./health_check');
const UpdateNode = require('./commands/update-node')
const ClusterNodes = require('./collections/cluster_nodes')
const Entity = require('../misc/entity')
const Majority = require('../misc/majority')
const SetClusterState = require('./commands/set-cluster-state')
const Commit = require('./commit')
const {quote} = require('shell-quote')

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

    check_nodes_limits() {

        // Active nodes

        const nodes_active = this.nodes.filter(node => node.active || !node.checked).length

        let nodes_spare_count = this.nodes.filter(node => node.available && node.spare).length

        let nodes_active_deficit = (this.config.min_active_nodes || 0) - nodes_active - this._nodes_starting


        while (nodes_active_deficit > 0) {

            const spare = nodes_spare_count > 0 ? this.nodes.one(node => node.available && node.spare) : false
            if (spare) {
                this.debug('activating a spare node: ' + spare.addr)
                this.clusterduck.commit([
                    (new UpdateNode).target(spare).attr({spare: false})
                ])
                --nodes_spare_count
            } else {
                this.debug('starting a node')
                ++this._nodes_starting
                setTimeout(() => --this._nodes_starting, 5e3)
                this.nodes.emit('start')
            }

            --nodes_active_deficit
        }


        // Spare nodes

        let nodes_spare_deficit = (this.config.min_spare_nodes || 0) - nodes_spare_count - this._spare_nodes_starting

        while (nodes_spare_deficit > 0) {

            this.debug('starting a spare node')

            ++this._spare_nodes_starting
            setTimeout(() => --this._soare_nodes_starting, 5e3)
            this.nodes.emit('start', {spare: true})

            --nodes_spare_deficit
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


        /**
         *
         * @type RaftTransport
         */
        const raft = this.clusterduck.transports.get('raft')

        if (raft) {
            raft.on('leader', () => this.nodes.forEach(node => node.emit('changed_shared_state', node)))
            raft.on('candidate', () => this.nodes.forEach(node => node.emit('changed_shared_state', node)))

            raft.on('state', state => {
                this.acceptCommits = ['LEADER', 'CANDIDATE'].includes(state)
            })

            raft.on('new-follower', follower => {
                this.debug('new follower: ', follower, ', sending ' + this.nodes.length + ' nodes')
                const commit = new Commit([
                    (new SetClusterState).target(this).addNodesFromCollection(this.nodes)
                ])
                raft.messageChild(follower, 'rpc-commit', commit.bundle())
            })
        } else {
            this.acceptCommits = true
        }

        this.triggers = new Collection('id')
        this.triggers.addFromArray(this.config.triggers || [])
        this.triggers.forEach(trigger => {
            const [prop, event] = trigger.on
            this[prop].on(event, (...args) => {
                let env = {
                    CLUSTER: this.name,
                    CD_OPTS: '-c ' + quote([this.clusterduck.argv.configFile]),
                }

                if (prop === 'nodes') {
                    env.nodes_active_addrs = JSON.stringify(this.nodes.active.map(node => node.addr))
                    env.nodes_active_count = this.nodes.active.length

                    if (event === 'start') {
                        env.CD_NODE_PARAMS = JSON.stringify(args[0])
                    }
                }

                (trigger.do || []).forEach((cfgAction) => {
                    const action = new (require('../actions/' + cfgAction.type))(cfgAction)
                    action.invoke(env)
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
            this.nodes.on('all', () => this.check_nodes_limits())
            this.check_nodes_limits()
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
