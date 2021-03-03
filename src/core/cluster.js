const arrayToObject = require('../misc/array-to-object')
const ClusterNode = require('./cluster_node')
const emitter = require('events').EventEmitter

class Cluster extends emitter {

    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor(config, clusterduck) {
        super();
        this.clusterduck = clusterduck
        this.update_config(config)
    }

    /**
     *
     * @param config
     */
    update_config(config) {
        this.config = config

        this.last_state_propagation = -1
        this.last_state_change = 0

        this._init_nodes(config.nodes || [])
        this._init_health_checks(config.health_checks || [])
        this._init_triggers(config.triggers || [])
    }

    /**
     *
     */
    touch_state() {
        this.last_state_change = Date.now()
    }

    /**
     *
     * @param nodes
     * @private
     */
    _init_nodes(nodes) {
        this.nodes = this.nodes || {}
        let i = 0
        const newNodes = arrayToObject(nodes, function (item) {
            item.pos = i++;
            return item.addr
        });
        for (let k in this.nodes) {
            if (newNodes[k] == null) {
                delete this.nodes[k]
                this.touch_state()
            }
        }
        for (let k in newNodes) {
            this.nodes[k] = (this.nodes[k] || new ClusterNode(this)).setConfig(newNodes[k])
        }
    }

    _init_triggers(triggers) {
        this.removeAllListeners()

        this.triggers = arrayToObject(triggers, 'hash')

        for (const [key, trigger] of Object.entries(this.triggers)) {
            this.on(trigger.on, function (nodes) {
                (trigger.do || []).forEach(function (cfgAction) {
                    const action = new (require('../actions/' + cfgAction.type))(cfgAction)
                    action.invoke({
                        nodes: nodes
                    })
                })

            });
        }
    }

    _init_health_checks(health_checks) {
        this.health_checks = arrayToObject(health_checks, 'hash')
    }

    get alive_nodes() {
        return ClusterNode.list(Object.entries(this.nodes)
            .filter(([key, node]) => node.alive))
            .sort((a, b) => a.pos - b.pos)
    }

    /**
     *
     */
    run_health_checks() {
        const cluster = this

        let clusterChecks = []
        for (const [key, node] of Object.entries(this.nodes)) {
            let checks = []

            for (const [hcId, hc] of Object.entries(this.health_checks)) {
                const promise = node.health_check(hcId, hc).triggerIfDue();
                if (promise != null) {
                    checks.push(promise)
                }
            }

            if (!checks.length) {
                return
            }
            clusterChecks.push(Promise.all(checks).then(function (list) {
                node.alive = true
            }).catch(function (error) {
                node.alive = false
            }))
        }

        Promise.all(clusterChecks).then(function (list) {
            const now = Date.now()
            if ((cluster.last_state_propagation|| 0) >= cluster.last_state_change) {
                return
            }
            cluster.last_state_propagation = now
            cluster.emit('nodes:alive', cluster.alive_nodes)
        })
    }
}

return module.exports = Cluster
