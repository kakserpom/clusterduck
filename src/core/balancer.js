const HashRing = require('hashring')
const ClusterNode = require('./cluster_node')
const Collection = require('./collection')
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
        this.ducklings = new Collection()
        this.ducklings.addRangeChangeListener(plus => plus
            .map(duckling => duckling.on('disconnect', () => this.ducklings.delete(duckling))))

        this.set_config(config)

        /**
         * Consistent hashing implementation
         * @type {HashRing}
         */
        this.ring = new HashRing(
            this._nodes_config(this.cluster.active_nodes),
            this.config.algo || 'md5',
            {
                'max cache size': this.config.cache_size || 10000
            });


        this.cluster.on('node:inserted', function () {

        })

        // Let's keep HashRing always up-to-date
        this.cluster.on('node:state', (node, state) => {
            if (node.active) {
                this.ring.add(this._nodes_config([node]))
            } else {
                this.ring.remove(node.addr)
            }
        })

        this.init()
    }

    get_node_by_key(key) {
        return this.cluster.nodes.get(this.ring.get(key)) || null
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
            if (node.weight != null) {
                opts.weight = node.weight
            }
            ret[node.addr] = opts
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
