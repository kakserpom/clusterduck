const ClusterNode = require('./cluster_node')
const Balancer = require('./balancer')
const emitter = require('events').EventEmitter
const Collection = require('../misc/collection')
const HealthCheck = require("./health_check");
const debug = require('diagnostics')('cluster')

const Commit = require('./commit')
const UpdateNode = require('./commands/update-node')
const ClusterNodes = require("./collections/cluster_nodes")

/**
 * Cluster model
 *
 * @abstract
 * @event node:changed
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

        this.nodes = new ClusterNodes('addr', node => {
            if (node.constructor.name === 'ClusterNode') {
                return node
            }
            return new ClusterNode(node, this)
        })

        this.nodes.on('inserted', node => {
            node.emit('inserted', node)

            node.on('changed', (node, state) => {
                this.nodes.emit('changed', node, state)
                this.nodes.emit('active', this.active)
            })
                .on('passed', node => {
                    this.clusterduck.commit([
                        (new UpdateNode).target(node).attr({available: true, checked: true})
                    ])
                })
                .on('failed', (node, error) => {
                    this.clusterduck.commit([
                        (new UpdateNode).target(node).attr({available: false, checked: true})
                    ])
                })

            debug(`${this.name}: INSERTED NODE: `, node.toObject())
            this.nodes.emit('active', this.nodes.active)

        }).on('deleted', node => {
            node.emit('deleted', node)

            debug(`${this.name}: DELETED NODE: `, node.toObject())
            this.nodes.emit('active', this.nodes.active)
        })

        this.nodes.addFromArray(this.config.nodes || [])

        this.nodesHealthChecks = new Map()

        this.balancers = new Collection('name', config => Balancer.factory(config, this))
        this.balancers.addFromObject(this.config.balancers || {})

        this.nodes.on('changed', (node, state) => {
            debug('nodes.changed: %s', node.addr, state)
        })

        this.balancers.forEach(balancer => balancer.start())

        process.on('exit', () => this.balancers.forEach(balancer => balancer.stop()))


        this.health_checks = new Collection('id', entry => {
            return entry
        })
        this.health_checks.addFromArray(this.config.health_checks || [])

        this.triggers = new Collection('id')
        this.triggers.addFromArray(this.config.triggers || [])
        this.triggers.forEach(trigger => {
            const [prop, event] = trigger.on;

            let getProp

            if (prop === 'nodes') {
                getProp = variable => {
                    if (variable === 'nodes_active_addrs') {
                        return JSON.stringify(this.nodes.active.map(node => node.addr))
                    }
                }
            } else {
                getProp = variable => {}
            }
            this[prop].on(event,  () => {
                (trigger.do || []).forEach((cfgAction) => {
                    const action = new (require('../actions/' + cfgAction.type))(cfgAction)
                    action.invoke(getProp)
                })

            });
        })

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
     * Run health checks on the cluster
     */
    run_health_checks() {
        const cluster = this

        let clusterChecks = []

        this.nodes.forEach(node => {
            let nodeChecks = []
            this.health_checks.forEach(hc => {
                const promise = this.health_check(node, hc).triggerIfDue();
                if (promise != null) {
                    nodeChecks.push(promise)
                }
            })

            if (!nodeChecks.length) {
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
