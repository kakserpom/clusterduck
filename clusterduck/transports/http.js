const http = require('http')
const yaml = require('js-yaml')
const Transport = require("../core/transport");

/**
 *
 */
class Http extends Transport {
    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor() {
        super(...arguments);

        (this.addons || []).forEach(addon => new (require(addon.require))(addon.config || {}, this))
    }

    doListen() {
        const port = this.listen || 8485

        this.fastify = require('fastify')()
        this.fastify.register(require('fastify-websocket'))
        this.fastify.get('/socket', {websocket: true}, (connection /* SocketStream */, req /* FastifyRequest */) => {
            connection.socket.send('hi from server')
            const handler = (...args) => connection.socket.send(...args)
            this.on('broadcast', handler)
            connection.socket
                .on('message', message => {
                    connection.socket.send('hi from server')
                })
                .on('close', () => this.off('broadcast', handler))
        })

        this.clusterduck.on('ready', () => {
            this.clusterduck.clusters
                .forEach(cluster => cluster.nodes
                    .on('*', (...args) => this.emit('broadcast', 'cluster-event', cluster.name, ...args))
                )
        })

        this.emit('listen')

        this.fastify.listen(port, err => {
            if (err) {
                console.error(err)
            }
        })
    }
}

return module.exports = Http

