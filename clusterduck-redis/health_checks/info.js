const redis = require('redis')
const {promisify} = require('util')
const parseAddr = require('clusterduck/misc/addr')

module.exports = (node, config, timeoutMs) =>
    new Promise(async (resolve, reject) => {

        const event = 'unhandled-rejection:ReplyError'
        process.listenerCount(event) || process.on(event, e => e.hide = true)

        const addr = parseAddr(node.addr)
        const client = redis.createClient({
            host: addr.hostname,
            port: addr.port,
            connect_timeout: timeoutMs,
            no_ready_check: !(node.enableReadyCheck || false)
        })

        const infoCommand = promisify(client.info).bind(client);
        const destroy = () => {
            if (client) {
                client.end(true)
            }
        }

        setTimeout(() => {
            reject(new Error('timeout'))
            destroy()
        }, timeoutMs)

        try {
            client.on('error', error => {
                reject(error)
                destroy()
            })
            const warnings = []
            const response = await infoCommand()
            const info = {}
            for (let [, key, value] of response.matchAll(/^(?!#)([^\n:]+):(.+)$/gm)) {
                const numeric = value.match(/^-?\d+(\.\d+)?$/)
                if (numeric) {
                    if (numeric[1]) {
                        value = parseFloat(value)
                    } else {
                        value = parseInt(value)
                    }
                }
                info[key] = value
            }
            if (info.loading) {
                throw new Error('Redis is still loading')
            }

            resolve({
                warnings,
                node_attrs: {info}
            })
            destroy()
        } catch (error) {
            reject(error)
            destroy()
        }
    })
