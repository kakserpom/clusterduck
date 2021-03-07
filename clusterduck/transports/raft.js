const md5 = require('md5')
const msg = require('axon')
const CryptoBox = require('../misc/cryptobox')
const Transport = require('../core/transport')
const Raft = require('liferaft')
const debug = require('diagnostics')('raft')

class RaftTransport extends Transport {
    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor(config, clusterduck) {
        super(config, clusterduck)

        this.clusterduck.quack = function() {
            debug('Cannot quack yet')
        };
    }

    doListen() {
        const transport = this
        return new Promise((resolve, reject) => {
            const cryptoBox = new CryptoBox(this.secret)

            const clusterduck = this.clusterduck

            class MsgRaft extends Raft {

                quack(payload, when) {
                    raft.message(
                        Raft.LEADER,
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
                    debug('initializing reply socket on port %s', this.address);

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
                    });

                    socket.on('error', () => {
                        debug('failed to initialize on port: ', this.address);
                    });
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
                        this.socket = msg.socket('req');

                        this.socket.connect(this.address);
                        this.socket.on('error', function err() {
                            console.error('failed to write to: ', this.address);
                        });
                    }
                    //debug('writing packet to socket on port %s', this.address);
                    if (cryptoBox) {
                        packet = cryptoBox.encrypt(JSON.stringify(packet));
                    }
                    this.socket.send(packet, (data) => {
                        fn(undefined, data);
                    });
                }
            }

            const raft = new MsgRaft(this.address, {
                'election min': 2000,
                'election max': 5000,
                'heartbeat': 1000,
                Log: require('liferaft/log'),
                path: this.path || '/var/run/clusterduck/db-' + md5(this.clusterduck.argv.pidFile)
            });

            raft.on('heartbeat timeout', function () {
                debug('heart beat timeout, starting election');
            })


            raft.on('term change', function (to, from) {
                debug('were now running on term %s -- was %s', to, from);
            }).on('leader change', function (to, from) {
                if (raft.state !== Raft.LEADER) {
                    transport.quack = raft.quack;
                }
                debug('we have a new leader to: %s -- was %s', to, from || 'unknown');
            }).on('state change', function (to, from) {
                debug('we have a state to: %s -- was %s', Raft.states[to], Raft.states[from]);
            });


            raft.on('commit', function (command) {
                console.log({command: command})
            })

            raft.on('leader', function () {
                transport.quack = function(quack, when) {
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
