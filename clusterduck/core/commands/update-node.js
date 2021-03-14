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

        this.set = {}
        this.command = 'update-node'
        this.once('beforeCommit', () => {
            Array.prototype.includesAny = () => {
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
        this.node = node
        this._proxy = new Proxy(node, {
            get: (target, property, receiver) => {
                return command.set.hasOwnProperty(property) ? command.set.property : target[property]
            }
        })
        this.path = node.path()

        return this
    }

    /**
     *
     * @param root
     */
    run(root) {
        const node = root.resolveEntityPath(this.path)

        if (!node) {
            console.log(this.command + ': node ' + JSON.stringify(this.path) + ' not found')
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
            node.emit('changed', node, node.state)
        }
    }

    get skip() {
        return Object.keys(this.set || {}).length === 0
    }

    attr(obj) {
        for (const [key, value] of Object.entries(obj)) {
            if (this._proxy[key] === value) {
                continue
            }

            this.set[key] = value
        }

        return this
    }
}


return module.exports = UpdateNode
