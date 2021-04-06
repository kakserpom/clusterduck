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
            } else if (packet[0] === 'tail') {
                this.emit('tail:' + packet[1], packet[2])
            }
        })
    }

    connected(callback) {
        if (this.socket && this.socket.readyState === 1) {
           callback(this.socket)
        }
        this.on('connected', callback)
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
        if (this.clusters[name]) {
            func(this.clusters[name])
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
        if (this.clusters[name]) {
            func(this.clusters[name])
        }
        this.on('cluster:' + name, func)
    }
}

const obj = new Clusterduck()
export default obj