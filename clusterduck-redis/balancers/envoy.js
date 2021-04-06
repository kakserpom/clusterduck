const Balancer = require('clusterduck/core/balancer')

const parseAddr = require('clusterduck/misc/addr')

const {spawn} = require('child_process')
const array = require('ensure-array')
const net = require('net');
const readline = require('readline')
const util = require('util')

/**
 *
 */
class EnvoyBalancer extends Balancer {

    /**
     *
     */
    init() {

        // https://www.envoyproxy.io/docs/envoy/latest/operations/cli#cmdoption-base-id
        this.base_id = null

        // https://www.envoyproxy.io/docs/envoy/latest/operations/cli#cmdoption-restart-epoch
        this.restart_epoch = 0

        this.debug = require('diagnostics')('envoy')
        this.debugDeep = require('diagnostics')('envoy-deep')

        this.socket = null
    }


    listen() {
        const send = () => this.socket.write(JSON.stringify(this.envoy()) + '\n')

        if (this.socket) {
            send()
            return
        }

        const socketFile = util.format(
            this.config.socket_file || '/var/run/clusterduck/envoy-wrapper-%s.sock',
            this.cluster.clusterduck.config_id
        )
        this.socket = net.createConnection(socketFile)
        this.socket.on('connect', () => {
            const rl = readline.createInterface({input: this.socket})
            send()
            rl.on('line', line => {
                const array = JSON.parse(line.trim())
                if (['debug', 'debugDeep'].includes(array[0])) {
                    this[array[0]](...array.slice(1))
                }
            })
        }).on('error', (e) => {
            this.socket = null
            const proc = spawn(this.config.envoy_wrapper_bin || __dirname + '/../bin/envoy-wrapper', [
                'start',
                '--pid-file', util.format(
                    this.config.pid_file || '/var/run/clusterduck/envoy-wrapper-%s.pid',
                    this.cluster.clusterduck.config_id
                ),
                '--socket-file', socketFile,
                '--envoy-bin', this.config.envoy_bin || 'envoy',
            ], {detached: true})
            proc.stdout.on('data', data => this.debug(data.toString()))
            proc.stderr.on('data', data => console.error(data.toString()))
            setTimeout(() => this.listen(), 1e3)
        })
    }

    /**
     * Start
     */
    start() {
        setImmediate((async () => {
            let changed = true
            this.cluster.nodes.on('all', () => changed = true)
            for (; ;) {
                if (changed) {
                    changed = false
                    await this.listen()
                }
                if (!changed) {
                    try {
                        await this.cluster.nodes.waitFor('all')
                    } catch (e) {
                    }
                }
            }
        }))
    }


    stop() {
        if (this.process) {
            this.process.kill()
        }
    }

    /**
     * Envoy configuration
     * @returns {{}}
     */
    envoy() {

        /**
         *  Generate address object
         * @param address
         * @param default_port
         * @returns {{mode: number, path: string}|{address: string, port_value: number}}
         */
        const address = (address, default_port) => {
            if (typeof address === 'number') {
                address = '0.0.0.0:' + address
            }
            const addr = parseAddr(address, default_port)
            if (addr.path) {
                return {
                    socket_address: {
                        path: addr.path,
                        mode: parseInt(addr.query.mode || 744)
                    }
                }
            } else {
                return {
                    socket_address: {
                        address: addr.hostname,
                        port_value: parseInt(addr.port)
                    }
                }
            }
        }

        // Envoy cluster definition
        const cluster = {

            // Unique cluster name
            name: this.cluster.name + '__' + this.name,

            // Connect timeout
            connect_timeout: this.config.connect_timeout || '1s',
            type: this.config.dns_type || 'strict_dns',

            // Load balancing polocy
            lb_policy: this.config.lb_policy || 'MAGLEV',

            load_assignment: {
                cluster_name: this.cluster.name,
                endpoints: [
                    {
                        // Let's make the list of active nodes
                        lb_endpoints: this.cluster.nodes.active.map(node => {
                            return {
                                endpoint: {
                                    address: address(node.addr, 6379)
                                }
                            }
                        })
                    }
                ]
            }
        }

        // Redis listener
        const listeners = array(this.config.listen).map((listen, i) => {
            return {
                name: cluster.name + '__listener_' + i,
                address: address(listen),
                filter_chains: [
                    {
                        filters: [
                            {
                                name: 'envoy.filters.network.redis_proxy',
                                typed_config: {
                                    '@type': 'type.googleapis.com/envoy.extensions.filters.network.redis_proxy.v3.RedisProxy',
                                    stat_prefix: 'egress_redis',
                                    settings: {
                                        op_timeout: this.config.op_timeout || '5s'
                                    },
                                    prefix_routes: {
                                        catch_all_route: {
                                            cluster: cluster.name
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        })

        // Now we make the final object
        let envoy = {

            // Let's group up static resources
            static_resources: {
                listeners: listeners,
                clusters: [
                    cluster
                ]
            }
        }

        // Administrative interface config
        if (this.config.admin) {
            envoy.admin = this.config.admin
        }

        return envoy
    }
}

module.exports = EnvoyBalancer
