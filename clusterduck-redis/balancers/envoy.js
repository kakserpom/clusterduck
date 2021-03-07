const Balancer = require('clusterduck/core/balancer')

const parseAddr = require('clusterduck/misc/addr')

const fs = require('fs')
const util = require('util')
const tmp = require('tmp-promise')

const debug = require('diagnostics')('envoy')

class BasicBalancer extends Balancer {


    /**
     *
     */
    init() {
        this.base_id = null
        this.restart_epoch = 0
    }

    /**
     * Start
     */
    start() {

        this.cluster.on('nodes:active', () => {
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

        const listener = {
            name: this.cluster.name + '_listener',
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
                                        cluster: this.cluster.name
                                    }
                                }
                            }
                        }
                    ]
                }
            ]
        }

        // Let's make the list of active nodes
        const endpoints = this.cluster.active_nodes.map(node => {
            return {
                endpoint: {
                    address: address(node.addr, 6379)
                }
            }
        })

        // Envoy cluster definition
        const cluster = {
            name: this.cluster.name,
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

    async listen() {
        const balancer = this

        const execute = args => {
            const quote = require('shell-quote').quote
            const exec = require('child_process').exec

            args = [
                'envoy',
                '--config-yaml', JSON.stringify(this.envoy()),
                '--restart-epoch', this.restart_epoch,
                '--drain-strategy', this.config.drain_strategy || 'immediate',
            ].concat(args)

            const command = quote(args)

            debug(`[${this.restart_epoch}] ${command}`)

            exec(command, {}, (error, stdout, stderr) => {

                if (error) {
                    debug(`error: ${error}`)
                }
            })
        }
        if (this.base_id) {
            ++this.restart_epoch
            execute(['--base-id', this.base_id])
        } else {
            const base_id_file = await tmp.file();
            execute([
                '--use-dynamic-base-id',
                '--base-id-path', base_id_file.path,
            ])

            function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms))
            }

            await sleep(500)

            this.base_id = parseInt(await util.promisify(fs.readFile)(base_id_file.path))

            debug(`acquired base id: ${this.base_id}`)

            await base_id_file.cleanup()
        }
    }
}

return module.exports = BasicBalancer
