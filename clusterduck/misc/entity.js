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
        return !key.match(/^_/)
    }

    /**
     *
     * @returns {{}}
     */
    export(withState) {
        const obj = {}
        for (const [key, value] of Object.entries(this)) {
            if (!this._exportable(key, withState)) {
                continue
            }
            if (isObj(value) && typeof value.export === 'function') {
                obj[key] = value.export(true)
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
