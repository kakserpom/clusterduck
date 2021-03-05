const arrayToObject = require('../misc/array-to-object')
const {v4: uuidv4} = require('uuid')

const emitter = require('events').EventEmitter

const Clusters = require('./collections/clusters')
const Ducklings = require('./collections/ducklings')
const Duckling = require('./duckling')

/**
 * Main class
 */
class ClusterDuck extends emitter {
    /**
     * Constructor
     * @param configFile
     */
    constructor(configFile, args) {
        super()

        this.isDuckling = require('cluster').isWorker

        this.slave = !!args.slave
        this.verbose = ![null, false].includes(args.verbose)


        if (this.isDuckling) {
            return
        }

        this.ducklings = new Ducklings(this)

        this.id = uuidv4()
        this.configFile = configFile
        this.config = require('../config')(this.configFile)

        this.pidFile = args.pidFile
        this.transports = {}

        this.on('quack', function () {
            console.log(arguments)
        })
    }

    duckling(callback) {
       new Duckling(duckling => {
           duckling.message('bootstrap', {
               id: this.id,
               config: this.config,
           })
           this.ducklings.add(duckling)
           callback(duckling)
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
     */
    init_transports() {
        for (const [key, instance] of Object.entries(arrayToObject(this.config.transports || [], item => item.type))) {
            const transport = new (require('../transports/' + instance.type))(instance, this);
            this.transports[key] = {
                config: instance,
                object: transport
            }
            if (typeof transport.listen != 'function') {
                console.log(transport)
                throw new Error('transport ' + JSON.stringify(instance) + ' does not have listen()');
            }

            transport.listen()
        }
    }


    /**
     *
     * @returns {Promise<void>}
     */
    async run() {
        this.init_transports()

        /**
         *
         * @type {Clusters}
         */
        this.clusters = new Clusters(this, this.config.clusters || [])

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
