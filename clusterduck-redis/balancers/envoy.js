const Balancer = require('clusterduck/core/balancer')

const parseAddr = require('clusterduck/misc/addr')

const fs = require('fs')
const util = require('util')
const tmp = require('tmp-promise')
const {quote} = require('shell-quote')
const {spawn} = require('child_process')
const debug = require('diagnostics')('envoy')
const debugDeep = require('diagnostics')('envoy-deep')

/**
 *
 */
class BasicBalancer extends Balancer {


    /**
     *
     */
    init() {

        // https://www.envoyproxy.io/docs/envoy/latest/operations/cli#cmdoption-base-id
        this.base_id = null

        // https://www.envoyproxy.io/docs/envoy/latest/operations/cli#cmdoption-restart-epoch
        this.restart_epoch = 0
    }

    /**
     * Start
     */
    start() {

        this.cluster.nodes.on('changed', () => {
            this.listen()
        })

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

        // Let's make the list of active nodes
        const endpoints = this.cluster.nodes.active.map(node => {
            return {
                endpoint: {
                    address: address(node.addr, 6379)
                }
            }
        })

        // Envoy cluster definition
        const cluster = {
            name: this.cluster.name + '__' + this.name,
            connect_timeout: this.config.connect_timeout || '1s',
            type: this.config.dns_type || 'strict_dns',
            lb_policy: this.config.lb_policy || 'MAGLEV',
            load_assignment: {
                cluster_name: this.cluster.name,
                endpoints: [
                    {
                        lb_endpoints: endpoints
                    }
                ]
            }
        }

        const listener = {
            name: cluster.name + '__listener',
            address: address(this.config.listen),
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

        // Now we make the final object
        let envoy = {}

        if (this.config.admin) {
            envoy.admin = this.config.admin
        }

        envoy.static_resources = {
            listeners: [
                listener
            ],
            clusters: [
                cluster
            ]
        }
        return envoy
    }

    stop() {
        if (this.process) {
            this.process.kill()
        }
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async listen() {

        const execute = args => {
            return new Promise((resolve, reject) => {

                const run = () => {
                    args = [
                        '--config-yaml', JSON.stringify(this.envoy()),
                        '--restart-epoch', this.restart_epoch,
                        '--drain-strategy', this.config.drain_strategy || 'immediate',
                    ].concat(args)

                    debug('[%s] %s', this.restart_epoch, quote(args))

                    this.process = spawn(this.config.envoy_bin || 'envoy', args)

                    this.process.stderr.on('data', data => {
                        data = data.toString()
                        debugDeep(data.split("\n").map(
                            line => `[cluster=${this.cluster.name} balancer=${this.name} epoch=${this.restart_epoch}] ${line}`
                        ))

                        if (data.match(/previous envoy process is still initializing/)) {
                            setTimeout(() => {
                                run()
                            }, 200)
                        } else if (data.match(/\] starting main dispatch loop/)) {
                            resolve()
                        }
                    })
                }

                run()
            })
        }

        if (this.base_id) {
            ++this.restart_epoch
            await execute(['--base-id', this.base_id])
        } else {
            const base_id_file = await tmp.file();
            await execute([
                '--use-dynamic-base-id',
                '--base-id-path', base_id_file.path,
            ])

            this.base_id = parseInt(await util.promisify(fs.readFile)(base_id_file.path))

            debug('acquired base id: %s', this.base_id)

            await base_id_file.cleanup()
        }
    }
}

return module.exports = BasicBalancer
