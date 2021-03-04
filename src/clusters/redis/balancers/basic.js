const Balancer = require('../../../core/balancer')
const net = require('net')

const RedisParser = require('redis-parser')
const RedisEncoder = require('sermone')
const Redis = require('ioredis')
const {RedisPool} = require('ioredis-conn-pool')
const {Response} = require('redis-protocol/lib/encoder')
const encode = function encode(data) {
    let encoded = ''
    let response = new Response({
        write: function (chunk) {
            encoded += chunk
        }
    });
    (function () {
        this.encode(data)
    }).call(response)
    return encoded
}


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
                min: 1,
                max: 1
            }
        })

        this._pools.set(node.config.addr, pool)
        return pool
    }


    listen() {
        const balancer = this

        class Connection {
            constructor(stream) {
                this.stream = stream
                this.parser = new RedisParser({
                    returnBuffers: false,
                    async returnReply(command) {
                        let key = 'default'
                        let pool, redis;
                        try {
                            const node = balancer.get_node_by_key(key)
                            pool = await balancer.get_pool(node)
                            redis = await pool.getConnection()

                            const res = await redis.sendCommand(
                                new Redis.Command(
                                    command[0],
                                    command.slice(1),
                                    'utf-8'
                                )
                            )
                            const packet = encode(res)
                            stream.write(packet)
                        } catch (e) {
                            if (e.name !== 'ReplyError') {
                                throw e
                            }
                            stream.write('-' + e.message + "\r\n")
                        } finally {
                            if (pool && redis) {
                                pool.release(redis)
                            }
                        }
                    },
                    returnError(err) {
                        console.log(err)
                    },
                    returnFatalError(err) {
                        console.log(err)
                    }
                })
                this.stream.on('data', (buffer) => {
                    // Here the data (e.g. `Buffer.from('$5\r\nHello\r\n'`))
                    // is passed to the parser and the result is passed to
                    // either function depending on the provided data.
                    this.parser.execute(buffer)
                });

                this.stream.on('end error', function (ev) {
                    console.log(ev)
                    this.stream = null
                })
            }
        }

        const server = net.createServer(socket => {
            new Connection(socket)
        })

        server.listen(this.config.listen)
    }
}

return module.exports = BasicBalancer
