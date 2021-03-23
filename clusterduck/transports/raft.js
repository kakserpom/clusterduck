const md5 = require('md5')
const msg = require('axon-tls')
const fs = require('fs')
const Transport = require('../core/transport')
const Liferaft = require('liferaft')
const Commit = require('../core/commit')
const util = require('util')
const path = require('path')
const Collection = require("../misc/collection");
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

        this.commitMode = this.commitMode || 'rpc'

        this.on('rpc-commit', bundle => {
            const commit = Commit.fromBundle(bundle)
            if (this.isLeader()) {
                // As a leader we need to make to commit it
                this.commit(commit)
            } else {
                // Just execute the transaction locally
                commit.execute(this.clusterduck)
            }
        })

        this.on('commit', bundle => {
            const commit = Commit.fromBundle(bundle)
            commit.execute(clusterduck)
        })

        this.peers = new Collection()

        let saveTimeout
        this.peers.on('all', () => {
            if (saveTimeout) {
                return
            }
            saveTimeout = setTimeout(() => {
                config.bootstrap = this.peers.keys().filter(addr => addr !== config.address)
                this.clusterduck.emit('config:changed')
                saveTimeout = null
            }, 1)
        })

    }

    /**
     *
     * @param commit Commit
     */
    commit(commit) {
        if (this.raft.state === Liferaft.LEADER) {
            if (this.commitMode === 'rpc') {
                this.messageFollowers('rpc-commit', commit.bundle())
                commit.execute(this.clusterduck)
            } else if (this.commitMode === 'log') {
                this.raft.command(commit.bundle())
            } else {
                this.clusterduck.panic(new Error('illegal raft.commitMode'))
                return
            }
        } else if (this.raft.state === Liferaft.CANDIDATE) {
            commit.execute(this.clusterduck)
        } else if (this.raft.state === Liferaft.FOLLOWER) {
            this.messageLeader('rpc-commit', commit.bundle())
        } else {
            this.setMaxListeners(1024)

            this.once('state change', () => {
                this.commit(commit)
            })
        }
    }

    /**
     *
     * @returns {boolean}
     */
    isLeader() {
        return this.raft.state === Liferaft.LEADER
    }

    /**
     *
     * @returns {boolean}
     */
    isCandidate() {
        return this.raft.state === Liferaft.CANDIDATE
    }

    join(addr) {
        if (!this.peers.has(addr)) {
            this.peers.set(addr, true)
            this.raft.join(addr)
        }
    }

    async messageLeader(type, data) {
        const when = () => {
        }

        const packet = await this.raft.packet(type, data)

        this.raft.message(
            Liferaft.LEADER,
            packet,
            when
        )
    }

    async messageFollowers(type, data, when) {
        const packet = await this.raft.packet(type, data)

        this.raft.message(
            Liferaft.FOLLOWER,
            packet,
            when || (() => {
            })
        )
    }

    async messageChild(address, type, data) {
        const when = () => {
        }

        const packet = await this.raft.packet(type, data)

        console.log(`emit ${type} to ${address}`)
        this.raft.message(
            address,
            packet,
            when
        )
    }

    /**
     *
     * @returns {Promise<unknown>}
     */
    doListen() {
        const transport = this

        return new Promise((resolve, reject) => {
            class DuckRaft extends Liferaft {

                /**
                 * Initialized, start connecting all the things.
                 *
                 * @param {Object} options Options.
                 * @api private
                 */
                initialize(options) {
                    debug('binding socket: %s', this.address)
                    const url = new URL(this.address)
                    const tlsOptions = {}

                    if (url.protocol === 'tls:') {
                        const configDir = path.dirname(transport.clusterduck.argv.configFile)
                        const pattern = (transport.tls === true ? false : transport.tls) || 'clusterduck.%s'
                        tlsOptions.key = fs.readFileSync(path.resolve(configDir, util.format(pattern, 'key')))
                        tlsOptions.cert = fs.readFileSync(path.resolve(configDir, util.format(pattern, 'cert')))
                    }

                    const socket = this.socket = msg.socket('rep', tlsOptions);

                    socket.bind(this.address)

                    socket.on('connect', conn => { ///  unused
                        const peer = (tlsOptions ? 'tls' : 'tcp')
                            + '://'
                            + conn.remoteAddress + ':' + conn.remotePort
                    })

                    socket.on('message', (data, fn) => {
                        if (data.peers) {
                            if (!Array.isArray(data.peers)) {
                                debug(`'peers' is not array`, data.peers)
                                return
                            }
                            data.peers.forEach(addr => transport.join(addr))
                            fn({
                                peers: transport.peers.keys()
                            })
                        } else {
                            transport.join(data.address)
                            this.emit('data', data, fn)
                        }
                    })

                    this.on('rpc', packet => {
                        if (packet.type === 'rpc-commit') {
                            transport.emit('rpc-commit', packet.data)
                        } else if (packet.type === 'new-follower') {
                            transport.emit('new-follower', packet.data)
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
                        transport.peers.set(this.address, this.socket)
                        this.socket.on('connect', () => {
                            this.socket.send({
                                peers: transport.peers.keys()
                            }, response => {
                                response.peers.forEach(addr => transport.join(addr))
                            })
                        })
                        this.socket.on('error', err => {
                            console.error('failed to write to: %s: %s', this.address, err)
                        })
                    }
                    debugDeep('sending a packet %s', this.address)
                    this.socket.send(packet, data => {
                        fn(undefined, data)
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


            raft.on('heartbeat timeout', () => {
                debug('heart beat timeout, starting election')
            })

            raft.on('term change', (to, from) => {
                debugDeep('were now running on term %s -- was %s', to, from)
            }).on('leader change', (to, from) => {
                debug('NEW LEADER: %s (prior was %s)', to, from || 'unknown')
            }).on('state change', (to, from) => {
                transport.emit('state change', to, from)
                transport.clusterduck.updateProcessTitle({RAFT: DuckRaft.states[to]})
                debug('STATE CHANGE: %s (prior from %s)', DuckRaft.states[to], DuckRaft.states[from])
            })

            raft.on('commit', command => {
                try {
                    transport.emit('commit', command)
                } catch (e) {
                    console.log(e)
                }
            })

            raft.on('leader', () => {
                debug('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                debug('I am elected as LEADER');
                debug('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');

                transport.emit('leader')
            });

            raft.on('candidate', () => {
                debug('----------------------------------');
                debug('I am starting as CANDIDATE');
                debug('----------------------------------');

                transport.emit('candidate')
            })

            raft.on('follower', () => {
                debug('----------------------------------');
                debug('I am starting as FOLLOWER');
                debug('----------------------------------');

                transport.emit('follower')
                setTimeout(() => {
                    transport.messageLeader('new-follower', raft.address)
                }, 300)
            })

            raft.on('join', node => {
                debug('joined: ', node.address)
            })

            raft.on('leave', addr => {
                transport.peers.delete(addr)
                debug('left: ', node.address)
            })

            for (const addr of (this.bootstrap || [])) {
                transport.join(addr)
            }

            resolve()
        })
    }
}

return module.exports = RaftTransport
