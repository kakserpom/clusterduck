const Redis = require("ioredis")
const parseAddr = require('clusterduck/misc/addr')

module.exports = (node, config, timeoutMs) =>
    new Promise(async (resolve, reject) => {

        const event = 'unhandled-rejection:ReplyError'
        process.listenerCount(event) || process.on(event, e => e.hide = true)

        const addr = parseAddr(node.addr)
        let clientConfig = {
            host: addr.hostname,
            port: addr.port,
            maxRetriesPerRequest: 0,
            //enableOfflineQueue: false,
            showFriendlyErrorStack: true
        }
        if (node.enableReadyCheck != null) {
            clientConfig.enableReadyCheck = node.enableReadyCheck
        }

        const client = new Redis(clientConfig)
        const destroy = () => {
            if (client) {
                if (client.stream) client.stream.destroy()
                client.disconnect()
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
            const response = await client.info()
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
