const emitter = require('events').EventEmitter

const YAML = require('js-yaml')
const fs = require('fs')
const Collection = require('../misc/collection')
const Transport = require('./transport')
const Cluster = require('./cluster')
const Commit = require("./commit")
const InsertNode = require("./commands/insert-node")
const DeleteNode = require("./commands/delete-node")

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
        this.verbose = ![null, false, undefined].includes(this.argv.verbose)
    }

    /**
     * Set config
     * @param config
     */
    set_config(config) {

        this.config = config

        this.clusters = (new Collection('name', config => Cluster.factory(config, this)))
            .addFromObject(this.config.clusters || {})
    }


    /**
     *
     * @param path
     * @returns object|null
     */
    resolveEntityPath(path) {
        let ptr = this
        path.map(key => {
            if (typeof ptr === 'object' && ptr instanceof Collection) {
                ptr = ptr.get(key)
            } else {
                ptr = ptr[key]
            }
        })
        return ptr
    }

    /**
     * API
     * @returns {{export: (function(): Promise<unknown>)}}
     */
    api(jayson) {

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
            clusters: args => {
                return new Promise((resolve, reject) => {
                    let clusters = {}
                    const res = this.clusters.forEach(cluster => {
                        clusters[cluster.name] = cluster.nodes.active.map(node => node.addr)
                    });
                    resolve(clusters)
                })
            },

            /**
             *
             * @param args
             * @param callback
             * @returns {Promise<void>}
             */
            insertNode: args => {
                return new Promise((resolve, reject) => {
                    try {
                        const [clusterName, node] = args
                        const cluster = this.clusters.get(clusterName)
                        if (!cluster) {
                            reject(error(1, 'Cluster not found'))
                            return
                        }

                        this.commit([
                            (new InsertNode).target(cluster).define(node)
                        ])

                        resolve(node)
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
            deleteNode: args => {
                return new Promise((resolve, reject) => {
                    try {
                        const [clusterName, addr] = args
                        const cluster = this.clusters.get(clusterName)
                        if (!cluster) {
                            reject(error(1, 'Cluster not found'))
                            return
                        }

                        const node = cluster.nodes.get(addr)
                        if (!node) {
                            reject(error(1, 'Node not found'))
                            return
                        }

                        this.commit([
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

    panic(err) {
        console.error(this.verbose ? err : err.message)
        process.exit(1)
    }

    /**
     * Main function for the core process
     * @returns {Promise<void>}
     */
    async run() {

        this.on('config:changed', () => {
            const yaml = YAML.dump(this.config)
            const tempPath = this.argv.configFile + '~' + Date.now()
            fs.writeFile(tempPath, yaml, {flag: 'w'}, () => {
                fs.rename(tempPath, this.argv.configFile, () => {
                    console.log('Config written')
                    this.emit('config:written')
                })
            })
        })

        this.transports = (new Collection('type', config => Transport.factory(config, this)))
            .addFromArray(this.config.transports || [])
        this.transports.forEach(transport => transport.doListen())


        this.clusters.forEach(cluster => cluster.run_health_checks())
        setInterval(() => {
            this.clusters.forEach(cluster => cluster.run_health_checks())
        }, 1000)

        process.on('unhandledRejection', e => {
            this.emit('unhandled-rejection:' + e.name, e)
            if (!e.hide) {
                console.error('Uncaught rejection', e)
            }
        });
    }

    commit(commands) {
        const commit = new Commit(commands)
        const raft = this.transports.get('raft')

        // Non-Raft mode
        if (!raft) {
            commit.run(this)
            return
        }

        raft.commit(commit)
    }
}

return module.exports = ClusterDuck;
