const Entity = require('../misc/entity')
const debug = require('diagnostics')('balancer')

/**
 * Abstract balancer
 * @abstract
 */
class Balancer extends Entity {

    /**
     *
     * @param config
     * @param cluster
     */
    constructor(config, cluster) {
        super()
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

    stop() {
    }

    _exportable(key, withState) {
        if (key !== 'cluster'
            && key !== 'name') {
            return super._exportable(key, withState)
        }
    }
}

Balancer.factory = (config, cluster) => {
    if (!config.type) {
        throw new Error('balancer type must be defined in ' + JSON.stringify(config))
    }
    const constructor = cluster.require(['./balancers/' + config.type, config.type])
    return new constructor(config, cluster)
}

module.exports = Balancer
