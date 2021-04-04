const Transport = require('../core/transport')
const array = require('ensure-array')
const crypto = require('crypto')

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

        (this.addons || []).forEach(addon => {
            if (typeof addon === 'string') {
                new (require(addon))(this)
            } else {
                new (require(addon.require))(this, addon)
            }
        })
    }

    doListen() {
        this.fastify = require('fastify')()

        if (this.auth) {
            this.fastify.register(require('fastify-basic-auth'), {
                validate: (username, password, req, reply, done) => {
                    const cmpUsername = username.length === this.auth.username.length && crypto.timingSafeEqual(
                        Buffer.from(username),
                        Buffer.from(this.auth.username)
                    )
                    const cmpPassword = password.length === this.auth.password.length && crypto.timingSafeEqual(
                        Buffer.from(password),
                        Buffer.from(this.auth.password)
                    )
                    if (cmpUsername && cmpPassword) {
                        done()
                    } else {
                        done(new Error('Winter is coming'))
                    }
                }, authenticate: {realm: 'Clusterduck'}
            })
        }

        this.fastify.after(() => {
            if (this.auth) {
                this.fastify.addHook('onRequest', (request, reply, done) => {
                    if (request.url === '/manifest.json') {
                        done()
                        return
                    }
                    this.fastify.basicAuth(request, reply, done)
                })
            }

            this.fastify.register(require('fastify-websocket'))
            this.fastify.get('/socket', {websocket: true}, stream => {
                const send = (...args) => {
                    stream.socket.send(JSON.stringify(args))
                }
                this.on('broadcast', send)

                this.clusterduck.clusters.forEach(cluster => send('cluster-state', cluster.export()))

                stream.socket
                    .on('message', message => {

                    })
                    .on('close', () => this.off('broadcast', send))
            })
        })

        this.clusterduck.on('ready', () => {
            this.clusterduck.clusters
                .forEach(cluster => cluster.nodes
                    .on('*', (...args) => this.emit('broadcast', 'cluster-event', cluster.name, ...args))
                )
        })

        this.emit('listen')

        this.fastify.listen(...array(this.listen), err => {
            if (err) {
                console.error(err)
            }
        })
    }
}

module.exports = Http

