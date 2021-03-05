const arrayToObject = require('../../misc/array-to-object')

/**
 *
 * @type {function(*=, *=): (Dict|undefined)}
 */
const Dict = require('collections/dict')

/**
 * Transports collection
 */
class Transports extends Dict {

    /**
     *
     * @param clusterduck
     */
    constructor(clusterduck) {
        super()
        this.clusterduck = clusterduck
        this.addMapChangeListener((balancer, key) => {

        })

        for (const [key, config] of Object.entries(arrayToObject(this.clusterduck.config.transports || [], item => item.type))) {

            this.add_transport(key, config)
        }
    }

    add_transport(key, config) {
        const constructor = require('../../transports/' + config.type)
        const transport = new constructor(config, this.clusterduck)
        this.set(key, transport)
        if (typeof transport.listen != 'function') {
            throw new Error('transport ' + JSON.stringify(config) + ' does not have listen()');
        }

        transport.listen()
    }
}

return module.exports = Transports

