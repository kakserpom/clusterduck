const redis = require("redis")
const Cluster = require('../core/cluster');

class HTTPCluster extends Cluster {
    constructor(config) {
        super(config);
    }

    get _health_checks() {
        return {
            basic: function (hc, node) {
                return new Promise(async (resolve, reject) => {
                    const split = node.split(':', 2)
                    const {promisify} = require("util")
                    const clientConfig = {
                        host: split[0],
                        port: parseInt(split[1] || 6379),
                    }
                    console.log(clientConfig)
                    const client = redis.createClient(clientConfig)
                    client.on('error', function (error) {
                        reject(error)
                    })

                    const setAsync = promisify(client.set).bind(client)

                    await setAsync('foo', 'bar')

                    resolve({})
                })
            }
        };

    }
}

return module.exports = FpmCluster;
