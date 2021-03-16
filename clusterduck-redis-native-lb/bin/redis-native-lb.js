const HashRing = require('hashring')
const Redis = require('ioredis')
const {RedisPool} = require('ioredis-conn-pool')
const RedisServer = require('../lib/redis-server')
const {ReplyError} = require("ioredis");
const parseAddr = require('clusterduck/misc/addr')

class Balancer {
    constructor(config) {
        /**
         * Consistent hashing implementation
         * @type {HashRing}
         */
        this.ring = new HashRing([],
            config.algo || 'md5',
            {
                'max cache size': config.cache_size || 10000
            });

        this._pools = new Map

        this.nodes = {}
    }

    addNode(node) {
        this.nodes[node.addr] = node
        this.ring.add(this._nodes_config([node]))
    }

    removeNode(node) {
        this.ring.remove(node.addr)
        delete this.nodes[node.addr]
    }

    get_node_by_key(key) {
        return this.nodes[this.ring.get(key)] || null
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

    /**
     * Get a pool
     * @param node
     * @returns {RedisPool|any}
     */
    get_pool(node) {
        let pool = this._pools.get(node.addr)
        if (pool) {
            return pool
        }

        pool = new RedisPool({
            redis: this.ioredis_config(node),
            pool: {
                min: 20,
                max: 50
            }
        })

        this._pools.set(node.addr, pool)
        return pool
    }

    /**
     * Listen
     */
    listen(listen) {
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
        })
        this.server.listen(listen)
        const close = () => {
            this.server.close()
        }
        process.on('SIGTERM', close)
        process.on('SIGINT', close)
        process.on('exit', close)
    }

    /**
     * Converts internal ClusterNode
     * @returns {addr: opts, ...}
     * @private
     * @param nodes Array of ClusterNode
     */
    _nodes_config(nodes) {
        let ret = {}
        nodes.map(node => {
            let opts = {}
            if (node.weight != null) {
                opts.weight = node.weight
            }
            ret[node.addr] = opts
        })
        return ret
    }

}

(async () => {
    const {
        Worker, isMainThread, parentPort, workerData
    } = require('worker_threads');

    const workers = []

    const cluster = require('cluster')

    const numCPUs = require('os').cpus().length

    if (cluster.isMaster) {
        // Fork workers.
        for (var i = 0; i < numCPUs; i++) {
            workers.push(cluster.fork())
        }

        cluster.on('death', function (worker) {
            console.log('worker ' + worker.pid + ' died');
        });

        if (parentPort) {
            parentPort.on('message', message => workers.forEach(worker => worker.send(message)))
        }
    } else {

        const balancer = new Balancer(workerData || {})
        const Commands = {
            addNode: node => {
                balancer.addNode(node)
            },
            removeNode: node => {
                balancer.removeNode(node)
            },
            listen: addr => {
                balancer.listen(addr)
            }
        }

        process.on('message', message => {
            const [command] = message
            Commands[command](...message.slice(1))
        })
    }
})()