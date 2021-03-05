const http = require('http')
const yaml = require('js-yaml')
const dnode = require('dnode')
const dnodePromise = require('dnode-promise')
const fs = require('fs')

/**
 *
 */
class Dnode {

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

    listen() {
        const clusterduck = this.clusterduck
        return new Promise((resolve, reject) => {
            if (this.address.match(/^\//)) {
                fs.existsSync(this.address) && fs.unlinkSync(this.address)
            }
            dnode(dnodePromise.toDnode(clusterduck.api())).on('remote', function (remote) {
                //remote.handshake(clusterduck.id)
            }).listen(this.address);

            resolve(this)
        })
    }

    client() {
        return new Promise((resolve, reject) => {
            const d = dnode.connect(this.address).on('remote', function (remote) {
                resolve([dnodePromise.toPromise(remote), d])
            })
        })
    }
}

return module.exports = Dnode

