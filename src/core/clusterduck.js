const arrayToObject = require('../misc/array-to-object')
const {v4: uuidv4} = require('uuid')

const emitter = require('events').EventEmitter

class ClusterDuck extends emitter {
    /**
     *
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
    }

    api() {
        return {
            export: function (callback) {
                callback()
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
        for (const [key, instance] of Object.entries(arrayToObject(this.config.transports || [], 'hash'))) {
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
        for (let k in this.config.clusters || []) {
            let clusterConfig = this.config.clusters[k]
            let cluster = new (require('../clusters/' + clusterConfig.type))(clusterConfig, clusterduck)
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
        this.init_clusters();

        process.on('unhandledRejection', e => {
            this.emit('unhandled-rejection:' + e.name, e)
            if (!e.hide) {
                console.error('Uncaught rejection', e)
            }
        });
    }
}

return module.exports = ClusterDuck;
