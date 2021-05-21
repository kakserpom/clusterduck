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

        const sendCommand = promisify(client.sendCommand).bind(client);

        const destroy = () => {
            if (client) {
                client.end(true)
            }
        }

        setTimeout(() => {
            reject(new Error('timeout'))
            destroy()
        }, timeoutMs + 100)

        try {
            client.on('error', error => {
                reject(error)
                destroy()
            })
            const commands = config.commands || []
            for (let i = 0; i < commands.length; ++i) {
                const command = commands[i]
                const res = await sendCommand(
                    command[0],
                    command.slice(1),
                )
            }
            resolve({})
            destroy()
        } catch (error) {
            reject(error)
            destroy()
        }
    })
