const Balancer = require('../../../core/balancer')
const Redis = require('ioredis')
const {RedisPool} = require('ioredis-conn-pool')
const RedisServer = require('../redis-server')
const {ReplyError} = require("ioredis");

class BasicBalancer extends Balancer {
    init() {
        this._pools = new Map;
    }

    get_pool(node) {
        let pool = this._pools.get(node.config.addr)
        if (pool) {
            return pool
        }

        pool = new RedisPool({
            redis: this.cluster.redis_config(node),
            pool: {
                min: 20,
                max: 50
            }
        })

        this._pools.set(node.config.addr, pool)
        return pool
    }


    listen() {
        const balancer = this
        this.server = RedisServer.createServer(async function (command) {
            let key = 'default'
            let pool, redis
            try {
                const node = balancer.get_node_by_key(key)
                if (node === null) {
                    throw new ReplyError('get_node_by_key(' + JSON.stringify(key) + ') returned null')
                }
                pool = await balancer.get_pool(node)
                redis = await pool.getConnection()

                const res = await redis.sendCommand(
                    new Redis.Command(
                        command[0],
                        command.slice(1),
                        'utf-8'
                    )
                )
                this.encode(res)
            } catch (e) {
                if (e.name !== 'ReplyError') {
                    throw e
                }
                this.error(e.message)
            } finally {
                if (pool && redis) {
                    pool.release(redis)
                }
            }
        }).listen(this.config.listen)
    }
}

return module.exports = BasicBalancer
