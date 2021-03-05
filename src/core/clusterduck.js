const arrayToObject = require('../misc/array-to-object')

const emitter = require('events').EventEmitter

const Clusters = require('./collections/clusters')
const Transports = require('./collections/transports')
const Ducklings = require('./collections/ducklings')
const Duckling = require('./duckling')

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

    set_config(config) {

        this.config = config
        /**
         *
         * @type {Clusters}
         */
        this.clusters = new Clusters(this, this.config.clusters || [])

        if (Duckling.isDuckling) {
            return
        }

        this.ducklings = new Ducklings()
    }

    duckling(callback) {
        new Duckling(duckling => {
            duckling.notify('bootstrap', {
                id: this.id,
                config: this.config,
            })
            duckling.on('ready', () => {
                this.ducklings.add(duckling)
                callback(duckling)
            })
        })
    }

    /**
     *
     * @returns {{export: (function(): Promise<unknown>)}}
     */
    api() {
        const clusterduck = this;
        return {
            export: function () {
                return new Promise((resolve, reject) => {
                    resolve(clusterduck.clusters.reduce((cluster, clusters) => {
                        clusters[cluster.name] = cluster.alive_nodes.addrs()
                        return clusters
                    }, {}))
                });
            },
        };
    }

    get dnode() {
        return new (require('../transports/dnode'))(
            {},
            this
        )
    }


    /**
     *
     * @returns {Promise<void>}
     */
    async run() {
        this.transports = new Transports(this)

        this.clusters.run_health_checks()
        setInterval(() => {
            this.clusters.run_health_checks()
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
