const Balancer = require('clusterduck/core/balancer')


const fs = require('fs')
const util = require('util')
const {quote} = require('shell-quote')
const debug = require('diagnostics')('haproxy')
const debugDeep = require('diagnostics')('haproxy-deep')
const md5 = require('md5')
const array = require('ensure-array')

/**
 *
 */
class BasicBalancer extends Balancer {

    /**
     * Start
     */
    start() {

        const throttleEvent = callback => {
            let timeout
            return (...args) => {
                if (timeout) {
                    return
                }
                timeout = setTimeout(() => {
                    timeout = null
                    callback(...args)
                }, 1)
            }
        }

        this.cluster.nodes.on('changed', throttleEvent(() => {
            this.listen()
        }))

    }

    _node_conf(node) {
        const name = 'websrv_' + md5(node.addr)

        let line = 'server ' + name + ' ' + node.addr

        if (node.maxconn) {
            line += 'maxconn ' + node.maxconn
        }

        if (node.weight) {
            line += ' weight ' + node.weight
        }

        if (node.cookie) {
            line += 'cookie ' + name
        }

        if (node.check) {
            line += ' check'
        }

        return line
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async listen() {

        const execute = args => {
            return new Promise(async (resolve, reject) => {
                const run = async () => {

                    const configs = array(this.config.config_file)

                    const nodes = this.cluster.nodes.active

                    for (let file of configs) {
                        let contents = (await fs.promises.readFile(file)).toString()

                        let changed = false
                        contents = contents.replaceAll(
                            /^[\x20\t]+#<servers(\/>|>.*?<\/servers>)\n?/smg,
                            tag => {
                                changed = true
                                const indent = tag.match(/^\s+/)[0]
                                return indent + '#<servers>\n'
                                    + nodes.map(node => indent + this._node_conf(node)).join('\n')
                                    + '\n' + indent + '#</servers>\n'
                            })
                        if (changed) {
                            await fs.promises.writeFile(file, contents)
                        }
                    }

                    const state_file = this.config.state_file || '/var/lib/haproxy/state-global'
                    const socket_file = this.config.socket || '/var/run/haproxy/admin.sock'


                    const execP = util.promisify(require('child_process').exec)

                    let socketAlive = (await fs.promises.stat(socket_file)).isSocket()

                    if (socketAlive) {
                        try {
                            await execP('echo "show servers state" | socat ' + quote([socket_file]) + ' - > ' + quote([state_file]))
                        } catch (e) {
                            socketAlive = false
                        }
                    }

                    if (!socketAlive) {
                        await execP('echo "#" > ' + quote([state_file]))
                    }

                    let args = []

                    const pidFile = this.config.pid_file || '/var/run/haproxy/haproxy.pid'

                    let pid;
                    try {
                        pid = parseInt(await fs.promises.readFile(pidFile)).toString()
                    } catch (e) {
                    }

                    for (let file of array(this.config.config_file)) {
                        args.push('-f', file)
                    }
                    args.push('-p', pidFile,
                        '-D',
                        '-sf', pid
                    )
                    this.config.reuse_socket = true
                    if (this.config.reuse_socket && socketAlive) {
                        args.push('-x', socket_file)
                    }

                    const bin = this.config.haproxy_bin || 'haproxy'
                    const command = quote([bin, ...args])
                    debug('%s', command)

                    try {
                        const {stdout, stderr} = await execP(command)
                        if (stderr.length) {
                            debug(stderr)
                        }
                        if (stdout.length) {
                            debugDeep(stdout)
                        }
                    } catch (e) {
                        debug(e)
                    }
                }

                await run()
            })
        }

        await execute()

    }
}

return module.exports = BasicBalancer
