const Balancer = require('../../../core/balancer')
const RedisParser = require('redis-parser')
const RedisEncoder = require('sermone')
const {RedisPool} = require('ioredis-conn-pool')
const net = require('net')

class BasicBalancer extends Balancer {
    init() {
        this._pools = new Map;
    }

    get_pool(addr) {
        let pool = this._pools.get(addr)
        if (pool) {
            return pool
        }

        const addrSplit = addr.split(addr, 2)

        pool = new RedisPool({
            redis: {
                port: addrSplit[1] || 6379,
                host: addrSplit[0]
            },
            pool: {
                min: 2,
                max: 10
            }
        })
        this._pools.set(addr, pool)
        return pool
    }


    listen() {
        const balancer = this

        class Connection {
            constructor(stream) {
                this.stream = stream
                this.parser = new RedisParser({
                    async returnReply(command) {
                        let key = 'default'
                        if (command.length && command[0].toLowerCase() === 'command') {
                            command.shift()
                        }
                        console.log(command)
                        const addr = balancer.ring.get(key)
                        console.log(addr)
                        const pool = balancer.get_pool(addr)
                        console.log(pool)
                        pool.command(...command, function (err, res) {
                            console.log([command, err, res])
                            this.stream.write(RedisEncoder.encode(err || res))
                        })
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
        });

        server.listen(this.config.listen)
    }
}

return module.exports = BasicBalancer
