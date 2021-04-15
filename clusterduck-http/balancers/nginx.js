const Balancer = require('clusterduck/core/balancer')
const debug = require('diagnostics')('nginx')
const debugDeep = require('diagnostics')('nginx-deep')
const throttleCallback = require('throttle-callback')
const writeFileAtomic = require('write-file-atomic')
const {execFile} = require('child_process')

/**
 *
 */
class NginxBalancer extends Balancer {

    /**
     *
     */
    init() {
        this.debug = require('diagnostics')('envoy')
        this.debugDeep = require('diagnostics')('envoy-deep')
        this._socket = null

        this.software = {
            logo: 'https://cdn.cdnlogo.com/logos/n/74/nginx.svg',
            name: 'Nginx',
            url: 'https://nginx.org/',
        }
    }

    /**
     * Start
     */
    start() {

        if (typeof this.config.upstream_conf_path !== 'string' || !this.config.upstream_conf_path.length) {
            debug('upstream_conf_path is required')
            return
        }

        if (typeof this.config.upstream_name !== 'string' || !this.config.upstream_name.length) {
            debug('this.config.upstream_name is required')
            return
        }

        this.cluster.nodes.on('all', throttleCallback(async () => {
            try {
                await this.listen()
            } catch (e) {
                console.error('Caught exception:', e)
            }
        }, 100))

    }

    /**
     *
     * @param node
     * @returns {string}
     * @private
     */
    _node_conf(node) {

        let line = 'server ' + node.addr

        for (const key in [
            'weight',
            'max_conns',
            'max_fails',
            'fail_timeout',
            'route',
            'service',
            'slow_start',

        ]) {
            if (node[key]) {
                line += key + ' ' + node[key]
            }
        }
        for (const key in [
            'backup',
            'down',
            'resolve',
            'drain',
        ]) {
            if (node[key]) {
                line += key
            }
        }

        line += ';'

        return line
    }

    upstream() {
        return 'upstream ' + this.config.upstream_name + ' {\n'
            + this.cluster.nodes.active.map(node => '\t' + this._node_conf(node)).join('\n')
            + (this.config.upstream_append ? '\n' + this.config.upstream_append + '\n' : '')
            + '\n}\n'
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async listen() {
        this.lastConfig = this.upstream()
        this.cluster.balancers.emit('change')
        await writeFileAtomic(this.config.upstream_conf_path, this.lastConfig)
        execFile(this.config.nginx_bin || 'nginx', [
            '-c', this.config.nginx_conf_path || '/etc/nginx/nginx.conf',
            '-s', 'reload'
        ], (error, stdout, stderr) => {
            if (stderr !== '') {
                console.error('http: nginx balancer: ' + stderr)
            }
        })
    }
}

module.exports = NginxBalancer


