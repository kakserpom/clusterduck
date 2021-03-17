const emitter = require('events').EventEmitter
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
    const constructor = require('../transports/' + config.type)
    const transport = new constructor(config, clusterduck)
    if (typeof transport.doListen != 'function') {
        throw new Error('transport ' + JSON.stringify(config) + ' does not have doListen()');
    }
    return transport

}
return module.exports = Transport
