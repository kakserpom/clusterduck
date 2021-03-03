const HealthCheck = require('./health_check')
const emitter = require('events').EventEmitter

class ClusterNode extends emitter {
    constructor(cluster) {
        super()
        this._health_checks = {}
        this.cluster = cluster
        this.last_state_change = 0
        this._alive = ClusterNode.STATE_UNKNOWN
    }

    setConfig(config) {
        this.config = config
        return this
    }

    set state(state) {
        if (this._state === state) {
            return
        }
        this._state = state
        this.last_state_change = Date.now()
        this.cluster.touch_state()
    }

    get alive() {
        return this._state === ClusterNode.STATE_ALIVE
    }

    health_check(hcId, hc) {
        return this._health_checks[hcId]
            || (this._health_checks[hcId] = new HealthCheck(this, hc));
    }
}

ClusterNode.list = function (nodes) {
    nodes.addrs = function () {
        return this.map(([key, node]) => node.config.addr)
    }
    return nodes
}

ClusterNode.STATE_UNKNOWN = 'unknown'
ClusterNode.STATE_ALIVE = 'alive'
ClusterNode.STATE_DEAD = 'dead'
ClusterNode.states = [ClusterNode.STATE_UNKNOWN, ClusterNode.STATE_ALIVE, ClusterNode.STATE_DEAD]

return module.exports = ClusterNode
