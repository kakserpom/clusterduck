const Balancer = require('../../../core/balancer')

const parseAddr = require('../../../misc/addr')

const fs = require('fs')
const util = require('util')

const debug = require('diagnostics')('envoy')

class BasicBalancer extends Balancer {
    init() {
        this.base_id = null
        this.restart_epoch = 0
    }


    start() {

        this.cluster.on('nodes:active', () => {
            this.listen()
        })

    }

    envoy() {
        const address = (address, default_port) => {
            const addr = parseAddr(address, default_port)
            if (addr.path) {
                return {
                    path: addr.path,
                    mode: parseInt(addr.query.mode || 744)
                }
            } else {
                return {
                    address: addr.hostname,
                    port_value: parseInt(addr.port)
                }
            }
        };

        const listener = {
            name: "redis_listener",
            address: {
                socket_address: address(this.config.listen)
            },
            filter_chains: [
                {
                    filters: [
                        {
                            name: "envoy.filters.network.redis_proxy",
                            typed_config: {
                                "@type": "type.googleapis.com/envoy.extensions.filters.network.redis_proxy.v3.RedisProxy",
                                stat_prefix: "egress_redis",
                                settings: {
                                    op_timeout: "5s"
                                },
                                prefix_routes: {
                                    catch_all_route: {
                                        cluster: "redis_cluster"
                                    }
                                }
                            }
                        }
                    ]
                }
            ]
        };


        const endpoints = this.cluster.active_nodes.map(node => {
            return {
                endpoint: {
                    address: {
                        socket_address: address(node.addr)
                    }
                }
            }
        });

        const cluster = {
            name: "redis_cluster",
            connect_timeout: "1s",
            type: "strict_dns",
            lb_policy: "MAGLEV",
            load_assignment: {
                cluster_name: "redis_cluster",
                endpoints: [
                    {
                        lb_endpoints: endpoints
                    }
                ]
            }
        };

        let envoy = {}

        envoy.admin = {
            access_log_path: "/tmp/admin_access.log",
            address: {
                socket_address: {
                    address: "127.0.0.1",
                    port_value: 9901
                }
            }
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
                '--restart-epoch', this.restart_epoch
            ].concat(args)

            const command = quote(args)

            debug(`[${this.restart_epoch}] ${command}`)

            exec(command, {}, (error, stdout, stderr) => {

                if (error) {
                    debug(`error: ${error}`)
                }
            });
        }
        if (this.base_id) {
            ++this.restart_epoch
            execute(['--base-id', this.base_id])
        } else {
            const base_id_path = '/tmp/envoy-base-id';

            execute([
                '--use-dynamic-base-id',
                '--base-id-path', base_id_path,
            ])

            function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }

            await sleep(500)

            this.base_id = parseInt(await util.promisify(fs.readFile)(base_id_path))

            debug(`acquired base id: ${this.base_id}`)

            await util.promisify(fs.unlink)(base_id_path)
        }
    }
}

return module.exports = BasicBalancer
