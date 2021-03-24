const Redis = require("ioredis")
const parseAddr = require('clusterduck/misc/addr')

const {parentPort, workerData} = require('worker_threads')
const {node, config, timeoutMs} = workerData;

(async () => {

    setTimeout(() => process.exit(1), timeoutMs).unref()


    // process.on('unhandledRejection', e => {})
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
    try {
        client.on('error', error => {
            throw error
        })
        const commands = config.commands || [
]
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
    } finally {
        if (client) {
            if (client.stream) client.stream.destroy()
            client.disconnect()
        }
    }
})()
