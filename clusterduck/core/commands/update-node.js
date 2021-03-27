const Command = require('./command')
const dotProp = require('dot-prop')

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
            Array.prototype.includesAny = function () {
                for (let i = 0; i < arguments.length; ++i) {
                    if (this.includes(arguments[i])) {
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
            get: (target, property, receiver) => {
                return command.set.hasOwnProperty(property) ? command.set[property] : target[property]
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
        try {
            const node = root.resolveEntityPath(this.path)

            if (!node.cluster.acceptCommits) {
                // Dropping it
                node.cluster.debug('update-node: acceptCommits is false, dropping')
                return
            }

            let changed = false, changed_ss = false
            for (const [key, value] of Object.entries(this.set)) {

                if (dotProp.get(node, key, null) === value) {
                    continue
                }
                dotProp.set(node, key, value)

                if (!key.match(/^shared_state\./)) {
                    changed = true
                } else {
                    changed_ss = true
                }
            }

            if (changed) {
                node.emit('changed', node, node.state)
            }

            if (changed_ss) {
                node.emit('changed_shared_state', node)
            }
        } catch (e) {
            console.error(e.message)
            console.error(this.command + ': ' + JSON.stringify(this.path) + ' failed')
        }

    }

    /**
     *
     * @returns {boolean}
     */
    get skip() {
        return Object.keys(this.set || {}).length === 0
    }

    /**
     *
     * @param id
     * @param state
     * @returns {UpdateNode}
     */
    setSharedState(id, state) {

        const attr = {}
        id = dotProp.escape(id)
        state.ts = Date.now()
        attr[`shared_state.${id}`] = state
        this.attr(attr)
        return this
    }

    /**
     *
     * @param obj
     * @returns {UpdateNode}
     */
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
