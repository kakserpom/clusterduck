const md5 = require('md5')
const msg = require('axon-tls')
const fs = require('fs')
const Transport = require('../core/transport')
const LIFERAFT_PKG = 'liferaft-patched'
const Liferaft = require(LIFERAFT_PKG)
const Commit = require('../core/commit')
const util = require('util')
const path = require('path')
const Peers = require("../core/collections/peers")
const debug = require('diagnostics')('raft')
const debugDeep = require('diagnostics')('raft-deep')
const {SHA3} = require('sha3')

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

        this.peers = new Peers()

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

    join(address) {
        if (address === this.address) {
            return
        }

        if (this.peers.has(address)) {
            return
        }

        const socket = msg.socket('req')

        this.peers.set(address, socket)

        socket.connect(address)
            .on('connect', () => {
                const hash = new SHA3(224)
                hash.update(JSON.stringify([this.address, this.passphrase, address]))
                socket.send({
                    hash: hash.digest('base64'),
                    address: this.address,
                    peers: this.peers.keys()
                }, response => {
                    if (response === 'auth_failed') {
                        debug(address + ': authentication failed')
                        return
                    }
                    this.raft.join(address)
                    response.peers.forEach(peer => this.join(peer))
                })
            })
            .on('socket error', err => {
                this.raft.leave(address)
                debugDeep('failed to write to: %s: %s', address, err)
            })
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

        debugDeep(`emit ${type} to ${address}`)
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

                    const boundSocket = this.socket = msg.socket('rep', tlsOptions);

                    boundSocket.bind(this.address)


                    boundSocket.on('error', () => {
                        debug('failed to initialize on port: ', this.address);
                    })
                    boundSocket.on('connect', socket => {
                        const peer = socket.remoteAddress + ':' + socket.remotePort
                        this.authenticated = false
                        socket.on('message', (data, fn) => {
                            try {
                                if (this.authenticated) {
                                    debugDeep('caught ' + JSON.stringify(data.type) + ' packet from %s', data.address)
                                    this.emit('data', data, fn)
                                    return
                                }

                                const hash = new SHA3(224)
                                hash.update(JSON.stringify([data.address, transport.passphrase, this.address]))
                                if (hash.digest('base64') !== data.hash) {
                                    fn('auth_failed')
                                    return
                                }

                                this.authenticated = true

                                if (!Array.isArray(data.peers)) {
                                    debug(`'peers' is not array`, data.peers)
                                    return
                                }
                                transport.join(data.address)
                                data.peers.forEach(addr => transport.join(addr))
                                fn({
                                    peers: transport.peers.keys()
                                })
                            } catch (e) {
                                fn('error')
                            }
                        })
                    })

                    this.on('rpc', packet => {
                        if (packet.type === 'rpc-commit') {
                            transport.emit('rpc-commit', packet.data)
                        } else if (packet.type === 'new-follower') {
                            transport.emit('new-follower', packet.data)
                        }
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
                    debugDeep('sending ' + JSON.stringify(packet.type) + ' packet %s', this.address)

                    transport.peers.get(this.address).send(packet, data => fn(undefined, data))
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
                Log: require(this.log_module || LIFERAFT_PKG + '/log'),
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
                transport.emit('is:leader', to === Liferaft.LEADER)
                transport.emit('state change', to, from)
                transport.clusterduck.updateProcessTitle({RAFT: DuckRaft.states[to]})
                debug('STATE CHANGE: %s (prior from %s)', DuckRaft.states[to], DuckRaft.states[from])
            })

            raft.on('commit', command => {
                try {
                    transport.emit('commit', command)
                } catch (e) {
                    console.error(e)
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
                }, 100)
            })

            raft.on('join', node => {
                debug('joined peer:', node.address)
            })

            raft.on('leave', node => {
                transport.peers.delete(node.address)
                debug('left peer:', node.address)
            })

            for (const addr of (this.bootstrap || [])) {
                transport.join(addr)
            }

            resolve()
        })
    }
}

return module.exports = RaftTransport
