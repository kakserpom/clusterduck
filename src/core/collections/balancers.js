const arrayToObject = require('../../misc/array-to-object')

/**
 *
 * @type {function(*=, *=): (Dict|undefined)}
 */
const Dict = require('collections/dict')

/**
 * Balancers collection
 */
class Balancers extends Dict {

    /**
     * @inheritDoc
     */
    constructor(cluster) {
        super()
        this.cluster = cluster
        this.addMapChangeListener((balancer, key) => {
            //this.add_balancer(key, balancer)
        })

        for (const [key, config] of Object.entries(arrayToObject(this.cluster.config.balancers || [], 'hash'))) {
            this.add_balancer(key, config)
        }
    }

    add_balancer(key, config) {
        const constructor = this.cluster.require('./balancers/' + config.type)
        const balancer = new constructor(config, this.cluster, key)
        this.set(key, balancer)
        balancer.init()
    }
}

return module.exports = Balancers

