const HealthCheck = require('./health_check')
const emitter = require('events').EventEmitter

class ClusterNode extends emitter {
    constructor(cluster) {
        super()
        this._health_checks = {}
        this.cluster = cluster
        this.last_state_change = 0
        this._alive = false
    }

    setConfig(config) {
        this.config = config
        return this
    }

    set alive(bool) {
        if (this._alive === bool) {
            return
        }
        this._alive = bool
        this.last_state_change = Date.now()
        this.cluster.touch_state()
    }

    get alive() {
        return this._alive
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

return module.exports = ClusterNode
