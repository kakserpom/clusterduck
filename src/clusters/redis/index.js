const Cluster = require('../../core/cluster')

class RedisCluster extends Cluster {
    require(what) {
        return require(what)
    }

    redis_config(node) {
        const split = node.addr.split(':', 2)
        let clientConfig = {
            host: split[0]
        }
        if (node.enableReadyCheck != null) {
            clientConfig.enableReadyCheck = node.enableReadyCheck
        }
        if (split.length > 1) {
            clientConfig.port = split[1]
        }
        return clientConfig
    }
}

return module.exports = RedisCluster
