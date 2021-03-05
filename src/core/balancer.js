const HashRing = require('hashring')
const ClusterNode = require('./cluster_node')
const Ducklings = require('./collections/ducklings')
const Duckling = require('./duckling')

/**
 * Abstract balancer
 * @abstract
 */
class Balancer {

    /**
     *
     * @param config
     * @param cluster
     * @param key
     */
    constructor(config, cluster, key) {
        this.cluster = cluster
        this.key = key
        this.ducklings = new Ducklings(this.cluster.clusterduck)
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


        this.cluster.on('node:inserted', function () {

        })

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

    get_node_by_key(key) {
        return this.cluster.get_node_by_addr(this.ring.get(key))
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

    spawnDucklings() {
        const numCPUs = require('os').cpus().length;
        for (let i = 0; i < numCPUs; ++i) {
            this.cluster.clusterduck.duckling(duckling => {
                this.ducklings.add(duckling)
                duckling.message('runBalancer', {
                    clusterName: this.cluster.name,
                    balancerKey: this.key
                })
            })
        }
    }
}

return module.exports = Balancer
