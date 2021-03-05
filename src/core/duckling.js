const emitter = require('events').EventEmitter

class Duckling extends emitter {
    constructor(callback) {
        super()
        this.process = require('cluster').fork().on('online', () => {
            callback(this)
        }).on('disconnect', () => {
            this.emit('disconnect', this)
        })
    }

    message(type, payload) {
        this.process.send({type: type, payload: payload})
    }
}

Duckling.run = function () {

    process.on('message', message => {
        ({
            bootstrap: payload => {
                this.id = payload.id
                this.config = payload.config
            },
            runBalancer: payload => {

                console.log('test')

                const Clusters = require('./collections/clusters')
                /**
                 *
                 * @type {Clusters}
                 */
                this.clusters = new Clusters(this, this.config.clusters || [])

                const cluster = this.clusters.get(payload.clusterName)
                const balancer = cluster.balancers[payload.balancerKey] || null
                balancer.listen()
            }
        }
            [message.type])(message.payload)
    })

}

return module.exports = Duckling