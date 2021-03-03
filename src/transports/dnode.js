const http = require('http')
const yaml = require('js-yaml')
const dnode = require('dnode')
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

        this.address = config.listen || this.clusterduck.pidFile.replace(/\.pid$/, '.sock')
    }

    listen() {
        const clusterduck = this.clusterduck
        if (this.address.match(/^\//)) {
            fs.existsSync(this.address) && fs.unlinkSync(this.address)
        }
        return dnode({
            export: function (callback) {

                callback();
            },
        }).on('remote', function (remote) {
            //remote.handshake(clusterduck.id)
        }).listen(this.address)
    }

    client() {
        return new Promise((resolve, reject) => {
            const d = dnode.connect(this.address).on('remote', function (remote) {
                resolve([remote, d])
            })
        })
    }
}

return module.exports = Dnode

