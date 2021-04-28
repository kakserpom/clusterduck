const Command = require('./command')
const dotProp = require('../../misc/dot-prop')

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
        this.delete = []
        this.command = 'update-node'
        this._ev.once('beforeCommit', () => {
            const includesAny = (array, values) => {
                for (let i = 0; i < values.length; ++i) {
                    if (array.includes(values[i])) {
                        return true
                    }
                }
                return false
            }

            const setKeys = Object.keys(this.set)

            if (includesAny(setKeys, ['available', 'checked'])) {
                this.set.available_changed = Date.now()
            }

            if (includesAny(setKeys, ['available', 'disabled', 'spare'])) {
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
     * @param clusterduck
     */
    run(clusterduck) {
        try {
            const cluster = clusterduck.resolveEntityPath(this.path.slice(0, -2))

            if (!cluster.acceptCommits) {
                // Dropping it
                cluster.debugDeep('update-node: acceptCommits is false, dropping')
                return
            }

            const node = clusterduck.resolveEntityPath(this.path)

            let changed = false, changed_ss = false

            this.delete.forEach(key => {
                if (dotProp.delete(node, key)) {
                    changed = true
                }
            })

            for (const [key, value] of Object.entries(this.set)) {

                const prev = dotProp.get(node, key, null)

                if (Array.isArray(value) && Array.isArray(prev)) {
                    if (JSON.stringify(value) === JSON.stringify(prev)) {
                        continue
                    }
                }
                else if (prev === value) {
                    continue
                }

                dotProp.set(node, key, value)
                const keySplit = key.split('.')
                if (keySplit[0] !== 'shared_state') {
                    if (keySplit[0] !== 'attrs') {
                        changed = true
                    }
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
            if (e instanceof clusterduck.errors.EntityNotFound) {
                return
            }
            console.error(this.command + ': ' + JSON.stringify(this.path) + ' failed', e)
        }

    }

    /**
     *
     * @returns {boolean}
     */
    get skip() {
        return Object.keys(this.set || {}).length === 0 && this.delete.length === 0
    }

    /**
     *
     * @param id
     * @param state
     * @returns {UpdateNode}
     */
    setSharedState(id, state) {

        const attr = {}
        state.ts = Date.now()
        state.id = id
        attr['shared_state.' + dotProp.escapeKeyProp(id)] = state
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

    /**
     *
     * @param key
     * @returns {UpdateNode}
     */
    deleteAttr(key) {
        this.delete.push(key)
        return this
    }
}

module.exports = UpdateNode
