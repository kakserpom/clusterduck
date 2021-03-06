const emitter = require('eventemitter2')
const debug = require('diagnostics')('transport')

/**
 *
 */
class Transport extends emitter {

    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor(config, clusterduck) {
        super()
        this.clusterduck = clusterduck

        for (const [key, value] of Object.entries(config)) {
            if (['clusterduck'].includes(key)) {
                throw new Error('Property ' + JSON.stringify(key) + ' cannot be set in constructor')
            }

            this[key] = value
        }
    }
}

/**
 *
 * @param config
 * @param clusterduck
 * @returns {*}
 */
Transport.factory = (config, clusterduck) => {
    if (config.disabled) {
        return null
    }
    const constructor = require('../transports/' + config.type)
    const transport = new constructor(config, clusterduck)
    if (typeof transport.doListen != 'function') {
        throw new Error('transport ' + JSON.stringify(config) + ' does not have doListen()');
    }
    return transport

}
module.exports = Transport
