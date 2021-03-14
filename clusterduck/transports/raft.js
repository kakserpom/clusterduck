const md5 = require('md5')
const msg = require('axon')
const fs = require('fs')
const CryptoBox = require('../misc/cryptobox')
const Transport = require('../core/transport')
const Liferaft = require('liferaft')
const Commit = require("../core/commit");
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

        this.on('replicaCommit', bundle => {
            this.commit(Commit.fromBundle(bundle))
        })

        this.on('commit', bundle => {
            const commit = Commit.fromBundle(bundle)
            commit.run(clusterduck)
        })
    }

    commit(commit) {
        if (this.raft.state === Liferaft.LEADER) {
            this.raft.command(commit.bundle())
        } else if (this.raft.state === Liferaft.CANDIDATE) {
            commit.run(this.clusterduck)
        } else {
            this.command(commit.bundle())
        }
    }

    /**
     *
     * @returns {Promise<unknown>}
     */
    doListen() {
        const transport = this
        return new Promise((resolve, reject) => {
            const cryptoBox = this.secret ? new CryptoBox(this.secret) : false

            class DuckRaft extends Liferaft {

                /**
                 * Initialized, start connecting all the things.
                 *
                 * @param {Object} options Options.
                 * @api private
                 */
                initialize(options) {
                    debug('binding socket: %s', this.address);

                    transport.command = async bundle => {
                        const when = () => {
                        }


                        const packet = await this.packet('replicaCommit', bundle)

                        this.message(
                            Liferaft.LEADER,
                            packet,
                            when
                        )
                    }

                    const socket = this.socket = msg.socket('rep');

                    socket.bind(this.address);
                    socket.on('message', (data, fn) => {
                        if (cryptoBox) {
                            const decrypted = cryptoBox.decrypt(data)
                            data = JSON.parse(decrypted)
                        }
                        this.emit('data', data, fn)
                    })

                    this.on('rpc', packet => {
                        if (packet.type === 'replicaCommit') {
                            transport.emit('replicaCommit', packet.data)
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
                    debugDeep('sending a packet %s', this.address)
                    if (cryptoBox) {
                        packet = cryptoBox.encrypt(JSON.stringify(packet))
                    }
                    this.socket.send(packet, (data) => {
                        fn(undefined, data);
                    })
                }
            }

            const logPath = this.path || '/var/lib/clusterduck/db-' + md5(this.clusterduck.argv.pidFile)
            try {
                fs.existsSync(logPath) || fs.mkdirSync(logPath, '0755', true)
            } catch (e) {
                this.clusterduck.panic(e)
                return
            }

            const raft = this.raft = new DuckRaft(this.address, {
                'election min': this.election_min || 2000,
                'election max': this.election_max || 5000,
                'heartbeat': this.heartbeat || 1000,
                Log: require(this.log_module || 'liferaft/log'),
                path: logPath,
                state: DuckRaft.STOPPED
            })

            raft.on('heartbeat timeout', function () {
                debug('heart beat timeout, starting election')
            })

            raft.on('term change', function (to, from) {
                debugDeep('were now running on term %s -- was %s', to, from)
            }).on('leader change', function (to, from) {
                debug('NEW LEADER: %s (prior was %s)', to, from || 'unknown')
            }).on('state change', function (to, from) {
                transport.clusterduck.updateProcessTitle({RAFT: DuckRaft.states[to]})
                debug('STATE CHANGE: %s (prior from %s)', DuckRaft.states[to], DuckRaft.states[from])
            });


            raft.on('commit', command => {
               try {
                   transport.emit('commit', command)
               } catch (e) {
                   console.log(e)
               }
            })

            raft.on('leader', () => {
                debug('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                debug('I am elected as leader');
                debug('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
            });

            raft.on('candidate', () => {
                debug('----------------------------------');
                debug('I am starting as candidate');
                debug('----------------------------------');
            })

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
