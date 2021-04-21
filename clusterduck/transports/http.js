const Transport = require('../core/transport');
const array = require('ensure-array');
const crypto = require('crypto')
const {spawn} = require('child_process')
const readline = require('readline');
const throttleCallback = require("throttle-callback");
const v8 = require('v8')

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

        this.debug = require('diagnostics')('debug');

        (this.addons || []).forEach(addon => {
            if (typeof addon === 'string') {
                new (require(addon))(this);
            } else {
                new (require(addon.require))(this, addon);
            }
        });
    }

    doListen() {
        this.fastify = require('fastify')();

        if (this.auth) {
            this.fastify.register(require('fastify-basic-auth'), {
                validate: (username, password, req, reply, done) => {
                    const cmpUsername = username.length === this.auth.username.length && crypto.timingSafeEqual(
                        Buffer.from(username),
                        Buffer.from(this.auth.username)
                    );
                    const cmpPassword = password.length === this.auth.password.length && crypto.timingSafeEqual(
                        Buffer.from(password),
                        Buffer.from(this.auth.password)
                    );
                    if (cmpUsername && cmpPassword) {
                        done();
                    } else {
                        done(new Error('Winter is coming'));
                    }
                }, authenticate: {realm: 'Clusterduck'}
            });
        }

        const raft = this.clusterduck.transports.get('raft')

        const memory = () => ({
            usage: process.memoryUsage(),
            stat: v8.getHeapStatistics(),
        })

        this.fastify.after(() => {
            if (this.auth) {
                this.fastify.addHook('onRequest', (request, reply, done) => {
                    if (request.url === '/manifest.json') {
                        done()
                        return
                    }
                    this.fastify.basicAuth(request, reply, done)
                });
            }

            this.fastify.register(require('fastify-websocket'));

            const api = this.clusterduck.api();
            this.fastify.get('/socket', {websocket: true}, stream => {
                const send = (...args) => {
                    try {
                        stream.socket.send(JSON.stringify(args))
                    } catch (e) {
                        console.error('Caught exception', e)
                    }
                };
                this.on('broadcast', send);
                send('memory', memory())

                this.clusterduck.clusters.forEach(cluster => send('cluster-state', cluster.export(true)));

                if (raft) {
                    send('raft-state', raft.export(true));
                }

                let tail;

                const localApi = {
                    balancerFetchInfo: args => {
                        try {
                            let [clusterName, balancerName, type, callback] = args
                            const cluster = this.clusterduck.clusters.get(clusterName)
                            if (!cluster) {
                                send('callback', callback, false)
                                return
                            }
                            const balancer = cluster.balancers.get(balancerName)
                            balancer.fetchInfo(type).then(info =>
                                send('callback', callback, [info]))
                        } catch (e) {
                            console.error('HTTP API error', e)
                        }
                    },
                    tail: args => {

                        if (tail) {
                            tail.kill()
                            tail = null
                        }

                        const type = ['stdout', 'stderr'].includes(args[0]) ? args[0] : null

                        if (!type) {
                            return
                        }

                        tail = spawn('tail', [
                            '-n', 100,
                            '-f', this.clusterduck.argv.logDir + '/' + type + '.log'
                        ]);

                        const rl = readline.createInterface({input: tail.stdout});
                        let buf = '';
                        let timer;
                        let bufCounter = 0;
                        const flushBuf = () => {
                            send('tail', type, buf);
                            buf = '';
                            bufCounter = 0;
                        };
                        rl.on('line', line => {
                            buf += line + '\n';
                            ++bufCounter;
                            clearTimeout(timer);
                            if (bufCounter > 10) {
                                flushBuf();
                            } else {
                                timer = setTimeout(flushBuf, 1);
                            }
                        });
                    }
                }

                stream.socket.on('message', message => {
                    try {
                        const packet = JSON.parse(message);
                        const command = packet[0];
                        const args = packet.slice(1);

                        if (localApi[command]) {
                            localApi[command](args)
                        } else {
                            api[command](args)
                        }
                    } catch (e) {
                        send('error', e.toString());
                    }
                }).on('close', () => {
                    if (tail) {
                        tail.kill()
                        tail = null
                    }
                    this.off('broadcast', send)
                });
            });
        });

        this.clusterduck.ready(clusterduck => {
            clusterduck.clusters.forEach(cluster => {
                const handler = throttleCallback(() => {
                    try {
                        this.emit('broadcast', 'cluster-state', cluster.export(true))
                    } catch (e) {
                        console.error(e)
                    }
                }, 0.5e3)
                cluster.nodes.on('*', handler)
                cluster.balancers.on('change', handler)
                handler()
            });
            if (raft) {
                const handler = () => {
                    try {
                        this.emit('broadcast', 'raft-state', raft.export(true))
                    } catch (e) {
                        console.error(e)
                    }
                }
                raft.peers.on('all', handler)
                raft.on('state', handler)
                this.emit('broadcast', 'raft-state', raft.export(true))
            }

            setInterval(() => this.emit('broadcast', 'memory', memory()), 5e3)
        });

        this.emit('listen');

        const listen = array(this.listen);
        this.debug('http: binding ', listen);
        this.fastify.listen(...listen, err => {
            if (err) {
                console.error(err);
            }
        });

        process.on('exit', () => {
            this.fastify.close();
        });
    }
}

module.exports = Http;

