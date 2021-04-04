const emitter = require('eventemitter2')
class Clusterduck extends emitter {

    /**
     *
     */
    constructor() {
        super()
        this.clusters = {}
        this.on('connect', () => {
            this.clusters = {}
        }).on('packet', packet => {
            if (packet[0] === 'cluster-state') {
                const cluster = packet[1]
                this.clusters[cluster.name] = cluster
                this.emit('state', this)
            }
        })
    }

    /**
     *
     * @param func
     */
    state(func) {
        func(this)
        this.on('state', func)
    }
}

const obj = new Clusterduck()
export default obj