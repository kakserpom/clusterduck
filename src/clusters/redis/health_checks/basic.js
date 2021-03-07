const Redis = require("ioredis")
return module.exports = function () {
    return new Promise(async (resolve, reject) => {

        const event = 'unhandled-rejection:ReplyError'
        this.cluster.clusterduck.listenerCount(event)
        || this.cluster.clusterduck.on(event, function (e) {
            e.hide = true
        });

        try {
            const client = new Redis(this.cluster.ioredis_config(this.node))
            client.on('error', function (error) {
                reject({error: error, hc: this.config})
            })

            await client.set('foo', 'bar')

            client.disconnect()
        } catch (error) {
            reject({error: error, hc: this.config})
        }

        resolve({})
    })
}
