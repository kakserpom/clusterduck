const Cluster = require('clusterduck/core/cluster')
const parseAddr = require('clusterduck/misc/addr')

class RedisCluster extends Cluster {
    constructor(config, clusterduck) {
        super(config, clusterduck)
        this.__dirname = __dirname
        this.software = {
            name: 'Redis',
            logo: 'https://cdn.cdnlogo.com/logos/r/3/redis.svg',
            url: 'https://redis.io/'
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

    ioredis_config(node) {
        const addr = parseAddr(node.addr)
        let clientConfig = {
            host: addr.hostname,
            port: addr.port,
            maxRetriesPerRequest: 0,
            //enableOfflineQueue: false,
            showFriendlyErrorStack: true
        }
        if (node.enableReadyCheck != null) {
            clientConfig.enableReadyCheck = node.enableReadyCheck
        }
        return clientConfig
    }
}

module.exports = RedisCluster
