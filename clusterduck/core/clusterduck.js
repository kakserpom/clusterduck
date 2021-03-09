const emitter = require('events').EventEmitter

const Collection = require('../misc/collection')
const Transport = require('./transport')
const Duckling = require('./duckling')
const Cluster = require('./cluster')
const Commit = require("./commit")

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
        this.verbose = ![null, false].includes(this.argv.verbose)
    }

    /**
     * Set config
     * @param config
     */
    set_config(config) {

        this.config = config

        this.clusters = (new Collection('name', config => Cluster.factory(config, this)))
            .addFromObject(this.config.clusters || {})

        this.ducklings = new Collection()
        this.ducklings.addRangeChangeListener(plus => plus
            .map(duckling => duckling.on('disconnect', () => this.ducklings.delete(duckling))))
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
     * Spawn a duckling
     * @param callback
     */
    duckling(callback) {
        new Duckling(duckling => {
            duckling.notify('bootstrap', {
                id: this.id,
                config: this.config,
            })
            duckling.on('ready', () => {
                this.ducklings.add(duckling)
                this.clusters.forEach(cluster => {
                    cluster.nodes.forEach(node => {
                        duckling.notify('node:state', {
                            cluster: cluster.name,
                            node: node.addr,
                            state: node.state
                        })
                    })
                })
                callback(duckling)
            })
        })
    }

    /**
     * API
     * @returns {{export: (function(): Promise<unknown>)}}
     */
    api() {
        return {
            /**
             *
             * @param args
             * @param callback
             * @returns {Promise<void>}
             */
            export: async (args, callback) => {
                let clusters = {}
                const res = this.clusters.forEach(cluster => {
                    clusters[cluster.name] = cluster.active_nodes.map(node => node.addr)
                });
                callback(null, clusters)
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

    /**
     * Main function for a duckling
     */
    runDuckling() {

        process.on('unhandledRejection', e => {
            this.emit('unhandled-rejection:' + e.name, e)
            if (!e.hide) {
                console.error('Uncaught rejection', e)
            }
        });


        Duckling.events.on('bootstrap', payload => {
            this.id = payload.id
            this.set_config(payload.config)

            Duckling.events.on('run-balancer', params => {
                this.clusters.get(params.cluster)
                    .balancers
                    .get(params.balancer)
                    .listen()
            })
            Duckling.events.on('node:state', params => {
                this.clusters.get(params.cluster)
                    .nodes
                    .get(params.node)
                    .state = params.state
            })

            Duckling.notifyParent('ready')
        })
        Duckling.events.listen()
    }

    /**
     * Main function for the core process
     * @returns {Promise<void>}
     */
    async run() {
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
