const Cluster = require('clusterduck/core/cluster')

class HttpCluster extends Cluster {
    constructor(config, clusterduck) {
        super(config, clusterduck)
        this.__dirname = __dirname
        this.software = {
            name: 'HTTP',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/8/81/Http_icon.svg',
            url: 'https://ru.wikipedia.org/wiki/HTTP',
        }
    }

    require(what) {
        what = Array.isArray(what) ? what : [what]
        let error
        for (let i = 0; i < what.length; ++i) {
            try {
                return require(what[i])
            } catch (e) {
                if (e.code !== 'MODULE_NOT_FOUND') {
                    throw e
                }
                error = e
            }
        }
        throw error
    }
}

module.exports = HttpCluster
