const redis = require("redis")
const {promisify} = require("util")
return module.exports = function () {
    return new Promise(async (resolve, reject) => {

        const event = 'unhandled-rejection:ReplyError'
        this.node.cluster.clusterduck.listenerCount(event)
        || this.node.cluster.clusterduck.on(event, function(e) {
            e.hide = true
        });

        const split = this.node.config.addr.split(':', 2)
        const clientConfig = {
            host: split[0],
            port: parseInt(split[1] || 6379),
            no_ready_check: true,
        }
        const client = redis.createClient(clientConfig)
        client.on('error', function (error) {
            reject({error: error, hc: this.config})
        })

        const setAsync = promisify(client.set).bind(client)

        await setAsync('foo', 'bar')

        client.quit()

        resolve({})
    })
};
