const emitter = require('events').EventEmitter

const Collection = require('../misc/collection')
const Transport = require('./transport')
const Duckling = require('./duckling')
const Cluster = require('./cluster')

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
        const clusterduck = this;
        return {
            export: function () {
                return new Promise((resolve, reject) => {
                    resolve(clusterduck.clusters.reduce((cluster, clusters) => {
                        clusters[cluster.name] = cluster.active_nodes.map(node => node.addr)
                        return clusters
                    }, {}))
                });
            },
        };
    }


    /**
     *  Dnode API
     * @returns {Dnode}
     */
    get dnode() {
        return new (require('../transports/dnode'))(
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
}

return module.exports = ClusterDuck;
