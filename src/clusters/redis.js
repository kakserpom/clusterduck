const Cluster = require('../core/cluster')

class RedisCluster extends Cluster {
    get_health_check(type) {
        return require('./redis/' + type)
    }
}

return module.exports = RedisCluster
