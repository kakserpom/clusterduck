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
            const commands = config.commands || []
            for (let i = 0; i < commands.length; ++i) {
                const command = commands[i]
                const res = await client.sendCommand(
                    new Redis.Command(
                        command[0],
                        command.slice(1),
                        'utf-8'
                    )
                )
            }
            resolve('ok')
            destroy()
        } catch (error) {
            reject(error)
            destroy()
        }
    })
