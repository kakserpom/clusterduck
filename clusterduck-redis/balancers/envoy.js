const Balancer = require('clusterduck/core/balancer')

const parseAddr = require('clusterduck/misc/addr')

const fs = require('fs')
const util = require('util')
const tmp = require('tmp-promise')
const {quote} = require('shell-quote')
const {spawn} = require('child_process')
const debug = require('diagnostics')('envoy')
const debugDeep = require('diagnostics')('envoy-deep')
const array = require('ensure-array')

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

    stop() {
        if (this.process) {
            this.process.kill()
        }
    }

    /**
     *
     * @returns {Promise<unknown>}
     */
    listen() {

        return new Promise(async (resolve, reject) => {

            let args = [
                '--config-yaml', JSON.stringify(this.envoy()),
                '--drain-strategy', this.config.drain_strategy || 'immediate',
            ]
            let base_id_file

            if (this.base_id) {
                ++this.restart_epoch
                args = args.concat([
                    '--base-id', this.base_id,
                    '--restart-epoch', this.restart_epoch
                ])
            } else {
                base_id_file = await tmp.file();
                args = args.concat([
                    '--use-dynamic-base-id',
                    '--base-id-path', base_id_file.path,
                ])

            }

            debug('[%s] %s', this.restart_epoch, quote(args))

            try {
                this.process = spawn(this.config.envoy_bin || 'envoy', args)

                this.process.stderr.on('data', async data => {
                    data = data.toString()
                    debugDeep(data.split("\n").map(
                        line => `[cluster=${this.cluster.name} balancer=${this.name} epoch=${this.restart_epoch}] ${line}`
                    ))

                    if (data.match(/previous envoy process is still initializing/)) {
                        console.error(data)
                    } else if (data.match(/\] starting main dispatch loop/)) {

                        if (base_id_file) {
                            this.base_id = parseInt((await fs.promises.readFile(base_id_file.path)).toString())

                            debug('acquired base id: %s', this.base_id)

                            await base_id_file.cleanup()
                        }
                        resolve()
                    }
                })

                this.process.on('error', () => {
                    reject()
                })
            } catch (e) {
                reject(e)
            }
        })
    }
}

return module.exports = EnvoyBalancer
