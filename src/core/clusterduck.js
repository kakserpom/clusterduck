const arrayToObject = require('../misc/array-to-object')
const {v4: uuidv4} = require('uuid')

const emitter = require('events').EventEmitter

/**
 *
 */
class ClusterDuck extends emitter {
    /**
     * Constructor
     * @param configFile
     */
    constructor(configFile, args) {
        super()
        this.id = uuidv4()
        this.configFile = configFile
        this.config = require('../config')(this.configFile)
        this.slave = !!args.slave
        this.verbose = ![null, false].includes(args.verbose)
        this.pidFile = args.pidFile
        this.transports = {}

        this.on('quack', function() {
            console.log(arguments)
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
                    let clusters = {};
                    for (let cluster of clusterduck.clusters) {
                        clusters[cluster.name] = cluster.alive_nodes.addrs()
                    }
                    resolve(clusters)
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
    async init_clusters() {
        const clusterduck = this
        clusterduck.clusters = []
        for (const name in this.config.clusters || []) {
            let clusterConfig = this.config.clusters[name]
            let cluster = new (require('../clusters/' + clusterConfig.type))(clusterConfig, name, clusterduck)
            clusterduck.clusters.push(cluster)
        }
        if (!this.slave) {
            clusterduck.run_health_checks()
            setInterval(function () {
                clusterduck.run_health_checks()
            }, 1000)
        }
    }

    async run_health_checks() {
        const clusterduck = this
        clusterduck.clusters.map((cluster) => cluster.run_health_checks())
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async run() {
        this.init_transports()
        this.init_clusters()

        process.on('unhandledRejection', e => {
            this.emit('unhandled-rejection:' + e.name, e)
            if (!e.hide) {
                console.error('Uncaught rejection', e)
            }
        });
    }
}

return module.exports = ClusterDuck;
