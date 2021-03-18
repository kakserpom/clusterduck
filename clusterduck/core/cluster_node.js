const HealthCheck = require('./health_check')
const Entity = require('../misc/entity')

/**
 * Cluster node representation
 *
 * @event changed
 * @event passed
 * @event failed
 */
class ClusterNode extends Entity {
    constructor(entry, cluster) {
        super()
        this.cluster = cluster
        this.available = false
        this.active = false
        this.spare = false
        this.shared_state = {}

        for (const [key, value] of Object.entries(entry)) {
            if (ClusterNode.volatile.includes(key)) {
                throw new Error('Property ' + JSON.stringify(key) + ' is volatile and cannot be set in constructor')
            }

            this[key] = value
        }
    }

    /**
     *
     * @returns {*}
     */
    path() {
        return this.cluster.path().concat(['nodes', this.addr])
    }

    /**
     *
     * @returns {{}}
     */
    get state() {
        let state = {}
        ClusterNode.volatile.forEach(key => {
            state[key] = this[key]
        })
        return state
    }

    /**
     *
     * @param key
     * @returns {boolean}
     * @private
     */
    _exportable(key, withState) {
        return super._exportable(key, withState) && key !== 'cluster' && (withState || !ClusterNode.volatile.includes(key))
    }
}

ClusterNode.volatile = ['available', 'active', 'spare', 'checked', 'shared_state']
return module.exports = ClusterNode
