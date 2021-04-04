const jayson = require('jayson/promise')
const fs = require('fs')
const Transport = require('../core/transport')
const debug = require('diagnostics')('jayson')

/**
 *
 */
class JaysonTransport extends Transport {

    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor() {
        super(...arguments)

        this.address = this.listen || this.clusterduck.argv.pidFile.replace(/\.pid$/, '.sock')
    }

    doListen() {
        return new Promise((resolve, reject) => {
            if (this.address.match(/^\//)) {
                fs.existsSync(this.address) && fs.unlinkSync(this.address)
            }

            // create a server
            this.server = jayson.server(this.clusterduck.api());

            // listen
            debug('jayson', `listen  ${this.address}`)
            this.server.tcp().listen(this.address);

            resolve(this)
        })
    }

    client() {
        return jayson.client.tcp(this.address)
    }
}

module.exports = JaysonTransport

