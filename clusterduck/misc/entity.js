const emitter = require('eventemitter2')
const isObj = require('is-obj')

class Entity {

    constructor() {
        this._ev = new emitter({
            wildcard: true,
        })
    }

    on() {
        return this._ev.on(...arguments)
    }

    emit() {
        return this._ev.emit(...arguments)
    }


    _exportable(key, withState) {
        if (!key.match(/^_/)) {
            return this[key]
        }
    }

    /**
     *
     * @returns {{}}
     */
    export(withState) {
        const obj = {}
        for (const key of Object.keys(this)) {
            const value = this._exportable(key, withState)
            if (value === undefined) {
                continue
            }
            if (isObj(value)) {
                if (typeof value.export === 'function') {
                    obj[key] = value.export(true)
                } else {
                    obj[key] = value
                }
            } else {
                obj[key] = value
            }
        }
        return Object.fromEntries(
            Object.entries(obj)
                .sort(([a], [b]) => a.localeCompare(b))
        )
    }
}

module.exports = Entity
