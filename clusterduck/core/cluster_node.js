const HealthCheck = require('./health_check')
const Entity = require('../misc/entity')

/**
 * Cluster node representation
 *
 * @event node:state
 * @event node:passed
 * @event node:failed
 */
class ClusterNode extends Entity {
    constructor(entry, cluster) {
        super()
        this.cluster = cluster
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

    path() {
        return this.cluster.path().concat(['nodes', this.addr])
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
