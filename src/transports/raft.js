const md5 = require('md5')
const msg = require('axon')
const CryptoBox = require('../misc/cryptobox')
const LifeRaft = require('liferaft')
const debug = require('diagnostics')('raft')

class Raft {
    constructor(config, clusterduck) {

        this.config = config
        this.clusterduck = clusterduck
    }

    listen() {
        const cryptoBox = new CryptoBox(this.config.secret)

        class MsgRaft extends LifeRaft {

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
                    this.emit('data', data, fn)
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

        const raft = new MsgRaft(this.config.address, {
            'election min': 2000,
            'election max': 5000,
            'heartbeat': 1000,
            Log: require('liferaft/log'),
            path: this.config.path || '/var/run/clusterduck/db-' + md5(this.clusterduck.pidFile)
        });

        raft.on('heartbeat timeout', function () {
            debug('heart beat timeout, starting election');
        });

        raft.on('term change', function (to, from) {
            debug('were now running on term %s -- was %s', to, from);
        }).on('leader change', function (to, from) {
            debug('we have a new leader to: %s -- was %s', to, from);
        }).on('state change', function (to, from) {
            debug('we have a state to: %s -- was %s', to, from);
        });

        raft.on('commit', function (command) {
            console.log({command: command});
        });


        raft.on('leader', function () {
            debug('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
            debug('I am elected as leader');
            debug('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
        });

        raft.on('candidate', function () {
            debug('----------------------------------');
            debug('I am starting as candidate');
            debug('----------------------------------');
        });

        console.log(this.config.bootstrap);

        for (const addr of (this.config.bootstrap || [])) {
            debug('join ' + addr)
            if (addr === this.config.address) {
                continue;
            }
            raft.join(addr)
        }

    }
}

return module.exports = Raft
