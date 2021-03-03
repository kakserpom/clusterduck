const Cluster = require('../../core/cluster')

class RedisCluster extends Cluster {
    get_health_check(type) {
        return require('./health_checks/' + type)
    }
}

return module.exports = RedisCluster
