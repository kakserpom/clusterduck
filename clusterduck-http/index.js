const Cluster = require('clusterduck/core/cluster')

class HttpCluster extends Cluster {
    constructor(config, clusterduck) {
        super(config, clusterduck)
        this.__dirname = __dirname
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
