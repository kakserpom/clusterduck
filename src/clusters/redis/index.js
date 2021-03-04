const Cluster = require('../../core/cluster')

class RedisCluster extends Cluster {
    require(what) {
        return require(what)
    }
}

return module.exports = RedisCluster
