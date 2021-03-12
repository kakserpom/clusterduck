const Collection = require('../misc/collection')
const debug = require('diagnostics')('balancer')

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

        this.set_config(config)

        this.init()
    }

    init_ring() {

        const HashRing = require('hashring')
        /**
         * Consistent hashing implementation
         * @type {HashRing}
         */
        this.ring = new HashRing(
            this._nodes_config(this.cluster.nodes.active),
            this.config.algo || 'md5',
            {
                'max cache size': this.config.cache_size || 10000
            });


        this.cluster.nodes.on('deleted', node => this.ring.remove(node.addr))

        // Let's keep HashRing always up-to-date
        this.cluster.nodes.on('changed', node => {
            if (node.active) {
                this.ring.add(this._nodes_config([node]))
            } else {
                this.ring.remove(node.addr)
            }
        })
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
    }
}

Balancer.factory = (config, cluster) => {
    if (!config.type) {
        throw new Error('balancer type must be defined in ' + JSON.stringify(config))
    }
    const constructor = cluster.require('./balancers/' + config.type)
    return new constructor(config, cluster)
}

return module.exports = Balancer
