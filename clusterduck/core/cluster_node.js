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
        this.health_checks = new Map()
        this.cluster = cluster
        this.available = false
        this.active = false
        this.spare = false
        this.shared_state = {}

        if (entry !== null) {
            this.entry(entry)
        }

    }

    /**
     *
     * @param entry
     * @param skipCheck
     */
    entry(entry, skipCheck) {
        for (const [key, value] of Object.entries(entry)) {
            if (!skipCheck) {
                if (ClusterNode.volatile.includes(key)) {
                    throw new Error('Property ' + JSON.stringify(key) + ' is volatile and cannot be set in constructor')
                }
            }

            this[key] = value
        }

        return this
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
     * @private
     */
    _exportable(key, withState) {
        if (key === 'spare' && !this.spare) {
            return
        }
        if (key !== 'cluster' && (withState || !ClusterNode.volatile.includes(key))) {
            return super._exportable(key, withState)
        }
    }
}

ClusterNode.volatile = [
    'available',
    'available_changed',
    'active',
    'checked',
    'shared_state',
    'errors',
    'warnings',
    'attrs',
    'health_checks'
]
module.exports = ClusterNode
