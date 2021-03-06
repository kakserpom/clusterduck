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
    constructor(entry) {
        super()
        this.last_state_change = 0
        this.available = false
        this.active = false
        this.spare = false

        for (const [key, value] of Object.entries(entry)) {
            if (ClusterNode.volatile.includes(key)) {
                throw new Error('Property ' + JSON.stringify(key) + ' is volatile and cannot be set in constructor')
            }

            this[key] = value
        }
    }

    /**
     *
     * @param state
     */
    set state(state) {

        let changed = false
        for (const [key, value] of Object.entries(state)) {
            if (this[key] === value) {
                continue
            }

            changed = true
            this[key] = value
        }

        if (changed) {
            this.active = this.available && !this.disabled && !this.spare
            this.last_state_change = Date.now()
            this.emit('node:state', this, this.state)
        }
    }

    get state() {
        let state = {}
        ClusterNode.volatile.forEach(key => {
            state[key] = this[key]
        })
        return state
    }


}

ClusterNode.volatile = ['available', 'active', 'spare']
return module.exports = ClusterNode
