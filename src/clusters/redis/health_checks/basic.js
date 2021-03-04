const Redis = require("ioredis")
return module.exports = function () {
    return new Promise(async (resolve, reject) => {

        const event = 'unhandled-rejection:ReplyError'
        this.node.cluster.clusterduck.listenerCount(event)
        || this.node.cluster.clusterduck.on(event, function(e) {
            e.hide = true
        });

        const client = new Redis(this.node.cluster.redis_config(this.node))
        client.on('error', function (error) {
            reject({error: error, hc: this.config})
        })

        await client.set('foo', 'bar')

        client.disconnect()

        resolve({})
    })
}
