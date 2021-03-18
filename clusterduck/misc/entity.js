const emitter = require('events').EventEmitter

class Entity extends emitter {

    constructor() {
        super()
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
            if (typeof value === 'object' && typeof value.export === 'function') {
                obj[key] = value.export(true)
            } else {
                obj[key] = value
            }
        }
        return obj
    }
}

return module.exports = Entity
