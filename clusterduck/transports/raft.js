const md5 = require('md5')
const msg = require('axon')
const CryptoBox = require('../misc/cryptobox')
const Transport = require('../core/transport')
const Liferaft = require('liferaft')
const debug = require('diagnostics')('raft')
const debugDeep = require('diagnostics')('raft-deep')

class RaftTransport extends Transport {
    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor(config, clusterduck) {
        super(config, clusterduck)

        this.clusterduck.quack = function () {
            debug('Cannot quack yet')
        };
    }

    /**
     *
     * @returns {Promise<unknown>}
     */
    doListen() {
        const transport = this
        return new Promise((resolve, reject) => {
            const cryptoBox = new CryptoBox(this.secret)

            const clusterduck = this.clusterduck

            class DuckRaft extends Liferaft {

                quack(payload, when) {
                    raft.message(
                        DuckRaft.LEADER,
                        {type: 'quack', payload: payload},
                        when
                    )

                }

                /**
                 * Initialized, start connecting all the things.
                 *
                 * @param {Object} options Options.
                 * @api private
                 */
                initialize(options) {
                    debug('binding socket: %s', this.address);

                    const socket = this.socket = msg.socket('rep');

                    socket.bind(this.address);
                    socket.on('message', (data, fn) => {
                        if (cryptoBox) {
                            data = JSON.parse(cryptoBox.decrypt(data))
                        }
                        if (data.type === 'quack') {
                            console.log({quack: data.payload})
                            clusterduck.emit('quack', data.payload)
                        } else {
                            this.emit('data', data, fn)
                        }
                    })

                    socket.on('error', () => {
                        debug('failed to initialize on port: ', this.address);
                    })
                }

                /**
                 * The message to write.
                 *
                 * @param {Object} packet The packet to write to the connection.
                 * @param {Function} fn Completion callback.
                 * @api private
                 */
                write(packet, fn) {
                    if (!this.socket) {
                        this.socket = msg.socket('req')

                        this.socket.connect(this.address)
                        this.socket.on('error', function err() {
                            console.error('failed to write to: %s', this.address)
                        })
                    }
                    debugDeep('sending a packet %s', this.address);
                    if (cryptoBox) {
                        packet = cryptoBox.encrypt(JSON.stringify(packet))
                    }
                    this.socket.send(packet, (data) => {
                        fn(undefined, data);
                    })
                }
            }

            const raft = new DuckRaft(this.address, {
                'election min': this.election_min || 2000,
                'election max': this.election_max || 5000,
                'heartbeat': this.heartbeat || 1000,
                Log: require(this.log_module || 'liferaft/log'),
                path: this.path || '/var/run/clusterduck/db-' + md5(this.clusterduck.argv.pidFile)
            })

            raft.on('heartbeat timeout', function () {
                debug('heart beat timeout, starting election')
            })

            raft.on('term change', function (to, from) {
                debugDeep('were now running on term %s -- was %s', to, from)
            }).on('leader change', function (to, from) {
                if (raft.state !== DuckRaft.LEADER) {
                    transport.quack = raft.quack;
                }
                debug('NEW LEADER: %s (prior was %s)', to, from || 'unknown')
            }).on('state change', function (to, from) {
                debug('STATE CHANGE: %s (prior from %s)', DuckRaft.states[to], DuckRaft.states[from])
            });


            raft.on('commit', function (command) {
                console.log({command: command})
            })

            raft.on('leader', function () {
                transport.quack = function (quack, when) {
                    clusterduck.emit('quack', quack);
                    !when || when(quack);
                };
                debug('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                debug('I am elected as leader');
                debug('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
            });

            raft.on('candidate', function () {
                debug('----------------------------------');
                debug('I am starting as candidate');
                debug('----------------------------------');
            });

            console.log(this.bootstrap);

            for (const addr of (this.bootstrap || [])) {
                debug('join ' + addr)
                if (addr === this.address) {
                    continue;
                }
                raft.join(addr)
            }

            resolve()
        })
    }
}

return module.exports = RaftTransport
