const HashRing = require('hashring')
const ClusterNode = require('./cluster_node')

/**
 *
 */
class Balancer {

    /**
     *
     * @param config
     * @param cluster
     */
    constructor(config, cluster) {
        this.cluster = cluster
        this.update_config(config)

        /**
         * Consistent hashing implementation
         * @type {HashRing}
         */
        this.ring = new HashRing(
            this._nodes_config(this.cluster.alive_nodes),
            this.config.algo || 'md5',
            {
                'max cache size': this.config.cache_size || 10000
            });


        // Let's keep HashRing always up-to-date
        this.cluster.on('node:state', (node, state) => {
            if (state === ClusterNode.STATE_ALIVE) {
                this.ring.add(this._nodes_config([node]))
            } else {
                this.ring.remove(node.config.addr)
            }
        })

        this.init()
    }

    /**
     * Converts internal ClusterNode
     * @returns {addr: opts, ...}
     * @private
     * @param nodes Array of ClusterNode
     */
    _nodes_config(nodes) {
        let ret = {}
        nodes.map(node => {
            let opts = {}
            if (node.config.weight != null) {
                opts.weight = node.config.weight
            }
            ret[node.config.addr] = opts
        })
        return ret
    }

    /**
     *
     * @param config
     */
    update_config(config) {
        this.config = config
    }

    /**
     *
     */
    listen() {
    }
}

return module.exports = Balancer
