const ClusterNode = require('./cluster_node')
const Duckling = require('./duckling')
const Balancer = require('./balancer')
const emitter = require('events').EventEmitter
const Collection = require('../misc/collection')
const HealthCheck = require("./health_check");
const debug = require('diagnostics')('cluster')

const Commit = require('./commit')
const UpdateNode = require('./commands/update-node')

/**
 * Cluster model
 *
 * @abstract
 * @event node:state
 * @event node:passed
 * @event node:failed
 */
class Cluster extends emitter {

    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor(config, clusterduck) {
        super();
        this.name = config.name
        this.clusterduck = clusterduck
        this.set_config(config)
    }

    path() {
        return ['clusters', this.name]
    }

    /**
     * Called whenever the config is loaded/updated
     * @param config
     */
    set_config(config) {
        this.config = config

        this.last_state_propagation = -1
        this.last_state_change = 0


        // @TODO: refactor with proxy eventemitter
        this.removeAllListeners()

        this.on('node:passed', node => {
            this.clusterduck.commit([
                (new UpdateNode).target(node).attr({available: true})
            ])
        })

        this.on('node:failed',  (node, error) => {
            this.clusterduck.commit([
                (new UpdateNode).target(node).attr({available: false})
            ])
        })

        this.nodes = new Collection('addr', node => {
            return (new ClusterNode(node, this))
                .on('node:state', (node, state) => {
                    this.touch_state()
                    this.emit('node:state', node, state)
                })
        })

        this.nodes.addRangeChangeListener((plus, minus) => {
            plus.map(node => {
                node.emit('node:inserted', node)
                this.emit('node:inserted', node)
            })
            minus.map(node => {
                node.emit('node:deleted', node)
                this.emit('node:deleted', node)
            })
        })


        this.nodes.addFromArray(this.config.nodes || [])

        this.nodesHealthChecks = new Map()

        this.balancers = new Collection('name', config => Balancer.factory(config, this))
        this.balancers.addFromObject(this.config.balancers || {})

        if (Duckling.isDuckling) {
            return
        }

        this.on('node:state', (node, state) => {

            debug('node:state: %s', node.addr, state)
            this.clusterduck.ducklings.map(duckling => {
                duckling.notify('node:state', {
                    cluster: this.name,
                    node: node.addr,
                    state: state
                })
            })

            if (this.last_state_propagation >= this.last_state_change) {
                return
            }
            this.last_state_propagation =  Date.now()
            this.emit('nodes:active', this.active_nodes)
        })

        this.balancers.forEach(balancer => balancer.start())


        this.health_checks = new Collection('id', entry => {
            return entry
        })
        this.health_checks.addFromArray(this.config.health_checks || [])

        this.triggers = new Collection('id')
        this.triggers.addFromArray(this.config.triggers || [])
        this.triggers.forEach(trigger => {
            this.on(trigger.on, function (nodes) {
                (trigger.do || []).forEach(function (cfgAction) {
                    const action = new (require('../actions/' + cfgAction.type))(cfgAction)
                    action.invoke({
                        nodes: nodes
                    })
                })

            });
        })

    }

    /**
     * Change last_state_change
     */
    touch_state() {
        this.last_state_change = Date.now()
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
            hc = new HealthCheck(node, config, this.require('./health_checks/' + config.type))
            hc.cluster = this
            this.nodesHealthChecks.set(key, hc)
        }

        return hc
    }

    /**
     * Get an array of the alive nodes in the cluster
     * @returns {*}
     */
    get active_nodes() {
        return this.nodes.map(node => {
            return node.active ? node : false
        }).filter(item => item)
    }

    /**
     * Run health checks on the cluster
     */
    run_health_checks() {
        const cluster = this

        let clusterChecks = []

        this.nodes.forEach(node => {
            let checks = []
            this.health_checks.forEach(hc => {
                const promise = this.health_check(node, hc).triggerIfDue();
                if (promise != null) {
                    checks.push(promise)
                }
            })

            if (!checks.length) {
                return
            }
            clusterChecks.push(Promise.all(checks).then(function (list) {
                node.emit('node:passed', node)
                cluster.emit('node:passed', node)
            }).catch(function (error) {
                node.emit('node:failed', node, error)
                cluster.emit('node:failed', node, error)
            }))
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
