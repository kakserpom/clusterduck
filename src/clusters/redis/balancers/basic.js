const Balancer = require('../../../core/balancer')
const Redis = require('ioredis')
const {RedisPool} = require('ioredis-conn-pool')
const RedisServer = require('../redis-server')
const {ReplyError} = require("ioredis");

class BasicBalancer extends Balancer {
    init() {
        this._pools = new Map
    }

    get_pool(node) {
        let pool = this._pools.get(node.addr)
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

        this._pools.set(node.addr, pool)
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
                    throw new ReplyError('No active nodes in the cluster')
                }
                pool = await balancer.get_pool(node)
                redis = await pool.getConnection()

                redis.on('error', error => {
                    console.log({error: error})
                })

                const res = await redis.sendCommand(
                    new Redis.Command(
                        command[0],
                        command.slice(1),
                        'utf-8'
                    )
                )
                this.encode(res)
            } catch (e) {
                if (['ReplyError', 'MaxRetriesPerRequestError'].includes(e.name)) {
                    this.error(e.message)
                } else {
                    console.error(e)
                }

            } finally {
                if (pool && redis) {
                    pool.release(redis)
                }
            }
        }).listen(this.config.listen)
    }
}

return module.exports = BasicBalancer
