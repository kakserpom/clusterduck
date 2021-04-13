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
const debugPeers = require('diagnostics')('raft-peers')
const debugDeep = require('diagnostics')('raft-deep')
const {SHA3} = require('sha3')
const parseDuration = require('parse-duration')
const array = require('ensure-array')
const crypto = require('crypto')

class RaftTransport extends Transport {
    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor(config, clusterduck) {
        super(config, clusterduck)

        this.state = 'UNKNOWN'
        this.state_changed = Date.now()

        this.commitMode = this.commitMode || 'rpc'

        this.on('rpc-commit', bundle => {
            const commit = Commit.fromBundle(bundle)
            if (this.isLeader()) {
                // As a leader we need to make to commit it
                this.commit(commit)
            } else {
                // Just execute the transaction locally
                commit.execute(clusterduck)
            }
        })

        this.on('commit', bundle => {
            const commit = Commit.fromBundle(bundle)
            commit.execute(clusterduck)
        })

        this.peers = new Peers()

        let saveTimeout;

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
     * @param withState
     * @returns {{peers: (*[]|{})}}
     */
    export(withState) {
        return {
            address: this.address,
            state: this.state,
            peers: this.peers.map(peer => peer.export(withState))
        }
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

    /**
     *
     * @returns {boolean}
     */
    isLeaderOrLongCandidate() {
        return this.isLeader() || (this.isCandidate() && this.state_changed < Date.now() - 10e3)
    }

    /**
     *
     * @returns {boolean}
     */
    isFollower() {
        return this.raft.state === Liferaft.FOLLOWER
    }

    _socket(address) {
        const socket = msg.socket('req')
        socket.address = address
        socket.options = {}
        socket.latencies = []

        socket.on('connect', () => {
            debugPeers('CONNECT EVENT: ' + address)
            const hash = new SHA3(224)
            hash.update(JSON.stringify([this.address, this.passphrase, address]))
            socket.send({
                hash: hash.digest('base64'),
                address: this.address,
                peers: this.peers.keys(),
            }, response => {
                debugPeers('CONNECT EVENT: ' + address + ' RESPONSE', response)
                if (typeof response === 'string') {
                    debug(address + ': error: ' + response)
                    return
                }
                socket.connected = true
                socket.latencies = []
                socket.pingInterval = setInterval(() => {
                    const time = Date.now()
                    socket.send({type: 'ping'}, response => {
                        const latency = Date.now() - time
                        socket.latencies.push(latency)
                        if (socket.latencies.length > 5) {
                            socket.latencies.shift()
                        }
                    })
                }, 1e3)
                socket.options = response.options
                this.peers.emit('changed', socket)
                this.raft.join(address)
                response.peers.forEach(peer => this.join(peer))
            })
        })

        socket.on('socket error', err => {
            socket.connected = false
            socket.lastConnectAttempt = Date.now()
            debugDeep('failed to write to: %s: %s', address, err)
            this.raft.leave(address)
        })

        socket.lastConnectAttempt = Date.now()
        socket.connect(address)
        socket.export = withState => ({
            address: socket.address,
            connected: socket.connected,
            options: socket.options,
            role: (() => {
                if (socket.address === this.leader) {
                    return 'LEADER'
                } else if (socket.connected) {
                    return 'FOLLOWER'
                } else {
                    return 'UNKNOWN'
                }
            })(),
            latency: Math.round(socket.latencies.reduce((p, c) => p + c, 0) / socket.latencies.length * 100) / 100,
        })

        return socket
    }

    join(address) {
        if (address === this.address) {
            return
        }

        if (this.peers.has(address)) {
            const socket = this.peers.get(address)
            if (!socket.connected && socket.lastConnectAttempt + 5000 < Date.now()) {
                socket.removeAllListeners()
                socket.close()
                debug('STALE CLIENT, RECONNECT', address)
                this.peers.set(address, this._socket(address))
            }
        } else {
            this.peers.set(address, this._socket(address))
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
                        socket.connected = false
                        debugPeers(`boundSocket: connection from ${peer}`)
                        socket.on('message', (data, fn) => {
                            try {
                                if (data.type === 'ping') {
                                    fn()
                                    return
                                }

                                if (socket.connected) {
                                    debugDeep('caught ' + JSON.stringify(data.type) + ' packet from %s', data.address)
                                    this.emit('data', data, fn)
                                    return
                                }

                                const hash = new SHA3(224)
                                hash.update(JSON.stringify([data.address, transport.passphrase, this.address]))

                                const validHash = hash.digest('base64')

                                if (typeof data.hash !== 'string') {
                                    debug(`boundSocket: ${peer}: protocol error: ${JSON.stringify(data)}`)
                                    fn('protocol_error')
                                    return
                                }

                                if (validHash.length !== data.hash.length || !crypto.timingSafeEqual(
                                    Buffer.from(validHash),
                                    Buffer.from(data.hash)
                                )) {
                                    debug(`boundSocket: ${peer}: auth_failed`)
                                    fn('auth_failed')
                                    return
                                }

                                socket.options = data.options

                                socket.connected = true

                                socket.raftAddress = data.address
                                transport.join(data.address)

                                if (Array.isArray(data.peers)) {
                                    data.peers.forEach(addr => transport.join(addr))
                                }

                                const options = {}
                                const http = transport.clusterduck.transports.get('http')
                                if (http) {
                                    options.http = {
                                        url: 'http://' + (new URL(this.address)).hostname + ':' + array(http.listen)[0],
                                        addons: http.addons,
                                    }
                                }

                                fn({
                                    peers: transport.peers.keys(),
                                    options
                                })
                            } catch (e) {
                                debug('boundSocket: ' + (socket.raftAddress || peer) + ': error', e)
                                fn('error')
                            }
                        })
                    })

                    this.on('rpc', packet => {
                        if (packet.type === 'rpc-commit') {
                            transport.emit('rpc-commit', packet.data)
                        } else if (packet.type === 'commit') {
                            transport.emit('commit', packet.data)
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

                    const socket = transport.peers.get(this.address)

                    if (!socket) {
                        debug('SOCKET NOT FOUND, ' + JSON.stringify(packet.type) + ' packet %s', this.address)
                        return
                    }

                    if (!socket.connected) {
                        debug('SOCKET NOT CONNECTED, ' + JSON.stringify(packet.type) + ' packet %s', this.address)
                    }

                    socket.send(packet, data => {
                        try {
                            // If the connection went out of sync due to a quick node restart
                            if (data === 'protocol_error') {
                                socket.emit('socket error')
                                this.join(this.address)
                            } else {
                                fn(undefined, data)
                            }

                        } catch (e) {
                            console.error('Caught error:', e)
                        }
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
                'election min': parseDuration(this.election_min || '4s'),
                'election max': parseDuration(this.election_max || '10s'),
                'heartbeat': parseDuration(this.heartbeat || '2s'),
                Log: require(this.log_module || LIFERAFT_PKG + '/log'),
                path: logPath,
                state: DuckRaft.STOPPED
            })

            raft.on('heartbeat timeout', () => {
                debug('HEART BEAT TIMEOUT, starting election')
            })

            this.following = false
            this.leader = null
            const follow = () => {
                if (this.following) {
                    return
                }
                this.following = true
                setImmediate(() => {
                    transport.messageLeader('new-follower', raft.address)
                })
            }

            raft.on('term change', (to, from) => {
                debugDeep('were now running on term %s -- was %s', to, from)
            }).on('leader change', (to, from) => {
                debug('NEW LEADER: %s (prior was %s)', to, from || 'unknown')
                this.leader = to
                this.following = false

                if (this.isFollower()) {
                    follow()
                }
            }).on('state change', (to, from) => {
                this.state_changed = Date.now()
                this.state = DuckRaft.states[to] || 'UNKNOWN'
                transport.emit('state', this.state)
                transport.emit(DuckRaft.states[to].toLowerCase())

                if (this.isFollower()) {
                    follow()
                }

                transport.emit('state change', to, from)
                transport.clusterduck.updateProcessTitle({RAFT: this.state})
                debug('STATE CHANGE: %s (prior from %s)', this.state, DuckRaft.states[from])
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

            });

            raft.on('candidate', () => {
                debug('----------------------------------');
                debug('I am starting as CANDIDATE');
                debug('----------------------------------');
            })

            raft.on('follower', () => {
                debug('----------------------------------');
                debug('I am starting as FOLLOWER');
                debug('----------------------------------');
            })


            let interval
            transport.on('state', state => {
                clearInterval(interval)
                if (state === 'LEADER') {
                    interval = setInterval(() => {
                        debugPeers('--------------------------------------------------------------')
                        debugPeers('KNOWN PEERS: ', transport.peers.map((peer, address) => {
                            return address
                        }))
                        debugPeers('CONNECTED PEERS: ', transport.peers
                            .filter(peer => peer.connected)
                            .map((peer, address) => address)
                        )
                        debugPeers('LIFERAFT NODES: ', raft.nodes.map(node => {
                            return {
                                address: node.address,
                                state: Liferaft.states[node.state]
                            }
                        }))
                        debugPeers('--------------------------------------------------------------')
                    }, 5000)
                }
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

module.exports = RaftTransport
