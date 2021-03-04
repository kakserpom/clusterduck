const arrayToObject = require('../misc/array-to-object')
const {v4: uuidv4} = require('uuid')

const cluster = require('cluster')
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

        const cluster = require('cluster')
        this.isDuckling = cluster.isWorker

        this.slave = !!args.slave
        this.verbose = ![null, false].includes(args.verbose)


        if (this.isDuckling) {
            return
        }


        this.id = uuidv4()
        this.configFile = configFile
        this.config = require('../config')(this.configFile)

        this.pidFile = args.pidFile
        this.transports = {}

        this.on('quack', function () {
            console.log(arguments)
        })
    }

    duckling() {
        process.on('message', message => {
            ({
                bootstrap: payload => {
                    this.id = payload.id
                    this.config = payload.config
                },
                runBalancer: payload => {
                    this.init_clusters()
                    const cluster = this.clusters[payload.clusterName] || null
                    const balancer = cluster.balancers[payload.balancerKey] || null
                    balancer.listen()
                }
            }
                [message.type])(message.payload)
        })
    }

    spawn(callback) {
        const duckling = cluster.fork().on('online', () => {
            duckling.message('bootstrap', {
                id: this.id,
                config: this.config,
            })
            callback(duckling)
        });
        duckling.message = function (type, payload) {
            duckling.send({type: type, payload: payload})
        }
        return duckling
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
        this.clusters = {}
        for (const [name, config] of Object.entries(this.config.clusters || [])) {
            this.clusters[name] = new (require('../clusters/' + config.type))(config, name, this)
        }
    }

    async run_health_checks() {
        const clusterduck = this
        for (const [name, cluster] of Object.entries(clusterduck.clusters)) {
            cluster.run_health_checks()
        }
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async run() {
        this.init_transports()
        this.init_clusters()

        this.run_health_checks()
        setInterval(() => {
            this.run_health_checks()
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
