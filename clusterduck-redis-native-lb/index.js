const Balancer = require('clusterduck/core/balancer')

/**
 *
 */
class NativeBalancer extends Balancer {

    /**
     * Constructor
     */
    init() {

        if (!this.cluster.clusterduck.args.experimental) {
            throw new Error('clusterduck-redis: the native balancer is EXPERIMENTAL, --experimental is required')
        }

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

    /**
     * Start a balancer
     */
    start() {

    }
}

return module.exports = NativeBalancer
