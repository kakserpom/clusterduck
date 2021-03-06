class Transport {

    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor(config, clusterduck) {
        this.config = config
        this.clusterduck = clusterduck

        this.address = config.listen || this.clusterduck.argv.pidFile.replace(/\.pid$/, '.sock')
    }
}

Transport.factory = (config, clusterduck) => {
    const constructor = require('../transports/' + config.type)
    const transport = new constructor(config, clusterduck)
    if (typeof transport.listen != 'function') {
        throw new Error('transport ' + JSON.stringify(config) + ' does not have listen()');
    }
    return transport

}
return module.exports = Transport
