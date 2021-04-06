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
                this.emit('cluster:' + cluster.name, cluster)
            }
        })
    }

    connect(url) {
        this.ws_url = url
        const socket = this.socket = new WebSocket(this.ws_url);
        socket.addEventListener('open', () => this.emit('connected', socket));

        socket.addEventListener('message', ({data}) => {
            const packet = JSON.parse(data)
            this.emit('packet', packet)
            console.log('Message from server ', packet);
        });
    }

    command(...args) {
        if (!this.socket) {
            throw new Error('Connection is not established')
        }
        this.socket.send(JSON.stringify(args))
    }

    /**
     *
     * @param func
     */
    state(func) {
        func(this)
        this.on('state', func)
    }

    /**
     *
     * @param name
     * @param func
     */
    clusterOnce(name, func) {
        if (this.cluster[name]) {
            func(this.cluster[name])
        } else {
            this.once('cluster:' + name, func)
        }
    }


    /**
     *
     * @param name
     * @param func
     */
    cluster(name, func) {
        if (this.cluster[name]) {
            func(this.cluster[name])
        }
        this.on('cluster:' + name, func)
    }
}

const obj = new Clusterduck()
export default obj