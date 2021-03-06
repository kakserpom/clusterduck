const HashRing = require('hashring')
const ClusterNode = require('./cluster_node')
const Set = require('./set')
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
     */
    constructor(config, cluster) {
        this.name = config.name
        this.cluster = cluster
        this.ducklings = new Set()
        this.set_config(config)

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
    set_config(config) {
        this.config = config
    }

    /**
     *
     */
    listen() {

    }

    init() {
    }


    start() {
        if (!Duckling.isDuckling) {
            this.spawnDucklings()
        }
    }

    spawnDucklings() {
        const numCPUs = 1 || require('os').cpus().length
        for (let i = 0; i < numCPUs; ++i) {
            this.cluster.clusterduck.duckling(duckling => {
                this.ducklings.add(duckling)
                duckling.notify('run-balancer', {cluster: this.cluster.name, balancer: this.name})
            })
        }
    }
}

Balancer.factory =  (config, cluster) => {
    const constructor = cluster.require('./balancers/' + config.type)
    return new constructor(config, cluster)
}

return module.exports = Balancer
