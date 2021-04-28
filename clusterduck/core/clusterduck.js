const emitter = require('eventemitter2')

const Collection = require('../misc/collection')
const Transport = require('./transport')
const Cluster = require('./cluster')
const Commit = require('./commit')
const InsertNode = require('./commands/insert-node')
const DeleteNode = require('./commands/delete-node')
const UpdateNode = require('./commands/update-node')
const Threads = require('./collections/threads')
const {v4: uuidv4} = require('uuid')
const uncaught = require('../misc/uncaught')
const array = require('ensure-array')
const md5 = require('md5')
const throttleCallback = require('throttle-callback')

/**
 * Main class
 */
class ClusterDuck extends emitter {

    /**
     * Constructor
     */
    constructor(argv) {
        super()
        this.argv = argv
        this.config_id = md5(argv.configFile)
        this.verbose = ![null, false, undefined].includes(this.argv.verbose)
        this.statuses = {}

        this._ready = false

        this.errors = {
            EntityNotFound: class extends Error {
            }
        }
    }

    /**
     *
     * @param update
     */
    updateProcessTitle(update) {
        Object.assign(this.statuses, update || {})
        const statuses = Object.values(this.statuses).filter(x => x !== null)
        const title = 'clusterduck: '
            + this.argv.configFile
            + (statuses.length ? ' (' + statuses.join(', ') + ')' : '')

        process.title = title
    }

    /**
     * Set config
     * @param configFile
     */
    async set_config_file(configFile) {

        this.configFile = configFile
        await this.configFile.load()
        this.config = configFile.getData()

        if (!this.threads) {
            this.threads = new Threads(this.config.threads || 4)
        }

        Object.entries(this.config.env || {}).map(([key, value]) => {
            if (key === 'DEBUG') {
                process.env[key] =
                    (process.env[key] ? process.env[key] + ',' : '')
                    + array(value || []).join(',')
            } else {
                process.env[key] = value
            }
        })
    }

    /**
     *
     * @param path
     * @returns object|null
     */
    resolveEntityPath(path) {
        let ptr = this

        path.forEach(key => {
            const forceProp = key.match(/^:/);
            if (forceProp) {
                key = key.slice(1)
            }
            if (!forceProp && typeof ptr === 'object' && typeof ptr.get === 'function') {
                ptr = ptr.get(key)
                if (ptr === null) {
                    throw new this.errors.EntityNotFound(key + ' not found')
                }
            } else if (forceProp || ptr.hasOwnProperty(key)) {
                ptr = ptr[key]
            } else {
                throw new this.errors.EntityNotFound(key + ' not found')
            }
        })
        return ptr
    }

    /**
     *
     * @param jayson
     * @returns {Promise<unknown>|{ls(*): Promise<void>, deleteNode(*): Promise<void>, insertNode(*): Promise<void>}}
     */
    api(jayson) {
        const clusterduck = this
        const error = (code, message) => {
            return {code: code, message: message}
        }

        return {

            /**
             *
             * @param args
             * @param callback
             * @returns {Promise<void>}
             */
            ls(paths) {
                return new Promise((resolve, reject) => {
                    try {
                        resolve(paths.map(path => {
                            const split = path.split('/')

                            try {
                                const entity = clusterduck.resolveEntityPath(split)
                                if (typeof entity.export === 'function') {
                                    return entity.export(true)
                                } else {
                                    return entity
                                }
                            } catch (e) {
                                return e.message
                            }
                        }))
                    } catch (error) {
                        reject(error(1, error.message))
                    }
                })
            },

            /**
             *
             * @param args
             * @param callback
             * @returns {Promise<void>}
             */
            insertNode(args) {
                return new Promise((resolve, reject) => {
                    try {
                        const [clusterName, node] = args
                        if (typeof clusterName !== 'string') {
                            reject(error(1, 'Invalid cluster name'))
                            return
                        }
                        const cluster = clusterduck.clusters.get(clusterName)
                        if (!cluster) {
                            reject(error(1, 'Cluster not found: ' + clusterName))
                            return
                        }

                        clusterduck.commit([
                            (new InsertNode).target(cluster).define(node)
                        ], commit => {
                            resolve(node)
                        })
                    } catch (e) {
                        console.log(e)
                        reject(error(1, e.message))
                    }
                })
            },

            /**
             *
             * @param args
             * @param callback
             * @returns {Promise<void>}
             */
            updateNode(args) {
                return new Promise((resolve, reject) => {
                    try {
                        const [clusterName, addr, attr] = args
                        const cluster = clusterduck.clusters.get(clusterName)
                        if (!cluster) {
                            reject(error(1, 'Cluster not found'))
                            return
                        }

                        const node = cluster.nodes.get(addr)
                        if (!node) {
                            reject(error(1, 'Cannot delete ' + JSON.stringify(addr) + ': node not found'))
                            return
                        }

                        clusterduck.commit([
                            (new UpdateNode()).target(node).attr(attr)
                        ])

                        resolve('OK')
                    } catch (e) {
                        console.log(e)
                        reject(error(1, e.message))
                    }
                })
            },


            /**
             *
             * @param args
             * @param callback
             * @returns {Promise<void>}
             */
            deleteNode(args) {
                return new Promise((resolve, reject) => {
                    try {
                        const [clusterName, addr] = args
                        const cluster = clusterduck.clusters.get(clusterName)
                        if (!cluster) {
                            reject(error(1, 'Cluster not found'))
                            return
                        }

                        const node = cluster.nodes.get(addr)
                        if (!node) {
                            reject(error(1, 'Cannot delete ' + JSON.stringify(addr) + ': node not found'))
                            return
                        }

                        clusterduck.commit([
                            (new DeleteNode).target(node)
                        ])

                        resolve('OK')
                    } catch (e) {
                        console.log(e)
                        reject(error(1, e.message))
                    }
                })
            },
        }
    }


    /**
     * Jayson
     * @returns {JaysonTransport}
     */
    get jayson() {
        return new (require('../transports/jayson'))(
            {},
            this
        )
    }

    require(what) {
        return require(what)
    }

    /**
     *
     * @param err
     */
    panic(err) {
        console.error(this.verbose ? err : err.message)
        process.exit(1)
    }

    /**
     *
     * @param callback(this)
     */
    ready(callback) {
        if (this._ready) {
            callback(this)
        } else {
            this.once('ready', callback)
        }
    }

    /**
     * Main function for the core process
     * @returns {Promise<void>}
     */
    async run() {


        this.transports = (new Collection('type', config => Transport.factory(config, this)))
            .addFromArray(this.config.transports || [])

        await Promise.all(this.transports.map(transport => transport.doListen()))

        /**
         *
         * @type RaftTransport
         */
        const raft = this.transports.get('raft')

        this.id = raft ? raft.address : uuidv4()

        this.clusters = (new Collection('name', config => Cluster.factory(config, this)))
            .addFromObject(this.config.clusters || {})
        this.clusters.setExportMode('object')


        this.on('config:changed', throttleCallback(() => {
            this.config.clusters = this.clusters.mapObj(cluster => [cluster.name, cluster.config])
            this.configFile.write()
        }, 1e3))

        this.clusters.forEach(cluster => cluster.run_health_checks())
        setInterval(() => this.clusters.forEach(cluster => cluster.run_health_checks()), 1000)

        uncaught()

        this._ready = true
        this.emit('ready', this)
    }


    /**
     *
     * @returns {number}
     */
    totalNodes() {
        /**
         *
         * @type RaftTransport
         */
        const raft = this.transports.get('raft')

        if (!raft) {
            return 1
        }

        return 1 + raft.peers.filter(peer => peer.connected).length
    }

    /**
     *
     * @param commands
     * @param callback
     */
    commit(commands, callback) {
        const commit = new Commit(commands)

        if (commit.length === 0) {
            return
        }

        /**
         *
         * @type RaftTransport
         */
        const raft = this.transports.get('raft')

        let ret
        if (callback === true) {
            ret = new Promise((resolve, reject) => {
                this.once('commit:' + commit.id, resolve)
            })
            setTimeout(() => commit.execute(this), 5e3)
        } else if (callback) {
            this.once('commit:' + commit.id, callback)
            setTimeout(() => commit.execute(this), 5e3)
        }

        // Non-Raft mode
        if (!raft) {
            commit.execute(this)
            return ret
        }

        raft.commit(commit)

        return ret
    }
}

module.exports = ClusterDuck;
