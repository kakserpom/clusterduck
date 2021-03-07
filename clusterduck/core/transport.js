class Transport {

    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor(config, clusterduck) {
        this.clusterduck = clusterduck

        for (const [key, value] of Object.entries(config)) {
            if (['clusterduck'].includes(key)) {
                throw new Error('Property ' + JSON.stringify(key) + ' cannot be set in constructor')
            }

            this[key] = value
        }
    }
}

Transport.factory = (config, clusterduck) => {
    const constructor = require('../transports/' + config.type)
    const transport = new constructor(config, clusterduck)
    if (typeof transport.doListen != 'function') {
        throw new Error('transport ' + JSON.stringify(config) + ' does not have doListen()');
    }
    return transport

}
return module.exports = Transport
