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

    toObject() {

    }
}

Balancer.factory = (config, cluster) => {
    if (!config.type) {
        throw new Error('balancer type must be defined in ' + JSON.stringify(config))
    }
    const constructor = cluster.require(['./balancers/' + config.type, config.type])
    return new constructor(config, cluster)
}

return module.exports = Balancer
