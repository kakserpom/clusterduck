const Redis = require("ioredis")
return module.exports = function () {
    return new Promise(async (resolve, reject) => {

        const event = 'unhandled-rejection:ReplyError'
        this.node.cluster.clusterduck.listenerCount(event)
        || this.node.cluster.clusterduck.on(event, function(e) {
            e.hide = true
        });

        const split = this.node.config.addr.split(':', 2)
        const clientConfig = {
            host: split[0]
        }
        if (this.node.config.enableReadyCheck != null) {
            clientConfig.enableReadyCheck = this.node.config.enableReadyCheck
        }
        if (split.length > 1) {
            clientConfig.port = split[1]
        }
        const client = new Redis(clientConfig)
        client.on('error', function (error) {
            reject({error: error, hc: this.config})
        })

        await client.set('foo', 'bar')

        client.disconnect()

        resolve({})
    })
};
