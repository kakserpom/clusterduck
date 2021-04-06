const Transport = require('../core/transport')
const array = require('ensure-array')
const crypto = require('crypto')
const {spawn} = require('child_process')
const readline = require('readline')

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

            const api = this.clusterduck.api()
            this.fastify.get('/socket', {websocket: true}, stream => {
                const send = (...args) => {
                    stream.socket.send(JSON.stringify(args))
                }
                this.on('broadcast', send)

                this.clusterduck.clusters.forEach(cluster => send('cluster-state', cluster.export()))

                let tail

                stream.socket
                    .on('message', message => {
                        try {
                            const packet = JSON.parse(message)
                            const command = packet[0]
                            const args = packet.slice(1)

                            if (command === 'tail') {
                                if (tail) {
                                    tail.kill()
                                }

                                const type = args[0] === 'stderr' ? 'stderr' : 'stdout'

                                tail = spawn('tail', [
                                    '-n', 100,
                                    '-f', this.clusterduck.argv.logDir + '/' + type + '.log'
                                ])

                                const rl = readline.createInterface({input: tail.stdout})
                                let buf = ''
                                let timer
                                let bufCounter = 0
                                const flushBuf = () => {
                                    send('tail', type, buf)
                                    buf = ''
                                    bufCounter = 0
                                }
                                rl.on('line', line => {
                                    buf += line + '\n'
                                    ++bufCounter
                                    clearTimeout(timer)
                                    if (bufCounter > 10) {
                                        flushBuf()
                                    } else {
                                        timer = setTimeout(flushBuf, 1)
                                    }
                                })
                            } else {
                                api[command](args)
                            }

                        } catch (e) {
                            send('error', e.toString())
                        }
                    })
                    .on('close', () => this.off('broadcast', send))
            })
        })

        this.clusterduck.ready(clusterduck => clusterduck.clusters
            .forEach(cluster => cluster.nodes
                .on('*', (...args) => {
                    try {
                        this.emit('broadcast', 'cluster-state', cluster.export())
                    } catch (e) {
                        console.error(e)
                    }
                    //this.emit('broadcast', 'cluster-event', cluster.name, ...args)
                })
            ))

        this.emit('listen')

        this.fastify.listen(...array(this.listen), err => {
            if (err) {
                console.error(err)
            }
        })
    }
}

module.exports = Http

