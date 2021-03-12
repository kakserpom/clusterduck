const Command = require('./command')

/**
 *
 */
class UpdateNode extends Command {

    /**
     * Constructor
     */
    constructor(hydrated) {
        super(hydrated)

        if (hydrated) {
            return
        }

        this.command = 'update-node'
        this.once('beforeCommit', () => {
            Array.prototype.includesAny = function () {
                for (let i = 0; i < arguments.length; ++i) {
                    if (this.includes(arguments[0])) {
                        return true
                    }
                }
                return false
            }
            if (Object.keys(this.set).includesAny('available', 'disabled', 'spare')) {
                this.set.active = Boolean(this._proxy.available && !this._proxy.disabled && !this._proxy.spare)
            }
        })
    }

    /**
     * Set target node
     * @param node
     * @returns {UpdateNode}
     */
    target(node) {
        const command = this
        this._proxy = new Proxy(node, {
            get: (target, property, receiver) => command.set[property] || target[property] || null
        })
        this.path = node.path()

        return this;
    }

    /**
     *
     * @param root
     */
    run(root) {
        const node = root.resolveEntityPath(this.path)

        if (!node) {
            console.log(this.command + ': node ' + JSON.stringify(this.path) + ' not found')
           // console.log(root.clusters.get('redis_cache').nodes.map(node => node.addr))
            console.log({
                6379: root.clusters.get('redis_cache').nodes.get({addr: '127.0.0.1:6379'}),
                6380: root.clusters.get('redis_cache').nodes.get({addr: '127.0.0.1:6380'}),
            })
            return
        }
        let changed = false
        for (const [key, value] of Object.entries(this.set)) {
            if (node[key] === value) {
                continue
            }
            node[key] = value
            changed = true
        }

        if (changed) {
            node.last_state_change = this.timestamp
            node.emit('node:state', node, node.state)
        }
    }

    get skip() {
        return Object.keys(this.set || {}).length === 0
    }

    attr(obj) {
        for (const [key, value] of Object.entries(obj)) {
            if (this.hasOwnProperty(key)) {
                if (this[key] === value) {
                    continue
                }
            }
            if (!this.set) {
                this.set = {}
            }
            this.set[key] = value
        }

        return this
    }
}


return module.exports = UpdateNode
