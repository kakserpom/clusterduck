const HealthCheck = require('./health_check')
const emitter = require('events').EventEmitter

/**
 * Cluster node representation
 *
 * @event node:state
 * @event node:passed
 * @event node:failed
 */
class ClusterNode extends emitter {
    constructor(config) {
        super()
        this._health_checks = {}
        this.last_state_change = 0
        this._state = ClusterNode.STATE_UNKNOWN
        this.config = config

        this.addr = config.addr
    }

    /**
     *
     * @param state
     */
    set state(state) {
        if (this._state === state) {
            return
        }

        this._state = state
        this.last_state_change = Date.now()
        this.emit('node:state', this, state)
    }

    get alive() {
        return this._state === ClusterNode.STATE_ALIVE
    }
}
ClusterNode.STATE_UNKNOWN = 'unknown'
ClusterNode.STATE_ALIVE = 'alive'
ClusterNode.STATE_DEAD = 'dead'
ClusterNode.states = [ClusterNode.STATE_UNKNOWN, ClusterNode.STATE_ALIVE, ClusterNode.STATE_DEAD]

return module.exports = ClusterNode
