const Cluster = require('clusterduck/core/cluster')
const parseAddr = require('clusterduck/misc/addr')

class RedisCluster extends Cluster {
    require(what) {
        return require(what)
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

return module.exports = RedisCluster
