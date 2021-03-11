const {SHAKE} = require('sha3');
const emitter = require('events').EventEmitter

class Collection extends emitter {
    constructor(key, hydrate) {
        super()
        this._map = new Map()
        this.key = key
        this.hydrate = hydrate || (entry => entry)
    }

    /**
     *
     * @param entry
     * @returns {string|*}
     * @private
     */
    extractKey(entry) {
        if (typeof entry === 'string') {
            return entry
        }
        return entry[this.key]
    }

    /**
     * @param ...entries
     * @returns {Collection}
     */
    add() {
        for (let i = 0; i < arguments.length; ++i) {
            const object = this.hydrate(arguments[i])
            const key = this.extractKey(object)
            if (!this._map.has(key)) {
                this._map.set(key, object)
                this.emit('added', object)
            }
        }
        return this
    }

    /**
     * @param ...entries
     * @returns {Collection}
     */
    remove() {
        for (let i = 0; i < arguments.length; ++i) {
            const object = this.get(arguments[i])
            if (object) {
                this._map.delete(this.extractKey(object))
                this.emit('removed', object)
            }
        }
        return this
    }

    /**
     * @param ...entries
     * @returns {Collection}
     */
    delete() {
        return this.remove(...arguments)
    }

    /**
     *
     * @param keyOrObject
     * @returns {any}
     */
    get(keyOrObject) {
        return this._map.get(this.extractKey(keyOrObject)) || null
    }

    /**
     *
     * @param keyOrObject
     * @returns {boolean}
     */
    has(keyOrObject) {
        return this._map.has(this.extractKey(keyOrObject))
    }

    /**
     *
     * @returns {any[]}
     */
    toArray() {
        return Array.from(this._map, ([name, value]) => value)
    }

    /**
     *
     * @param callback
     * @returns {Collection}
     */
    forEach(callback) {
        this._map.forEach(callback)
        return this
    }

    /**
     *
     * @param callback
     * @returns {[]}
     */
    map(callback) {
        const values = []
        this._map.forEach((value, key) => {
            values.push(callback(value, key, this))
        })
        return values
    }

    /**
     *
     * @param callback
     * @returns {[]}
     */
    filter(callback) {
        const values = []
        this._map.forEach((value, key) => {
            if (callback(value, key, this)) {
                values.push(value)
            }
        })
        return values
    }

    /**
     *
     * @param obj
     * @returns {string}
     */
    hash(obj) {
        const hash = new SHAKE(128)
        hash.update(JSON.stringify(obj))
        return hash.digest('hex')
    }

    /**
     *
     * @param array
     * @returns {Collection}
     */
    addFromArray(array) {
        for (const [i, entry] of Object.entries(array)) {
            entry[this.key] = entry[this.key] || this.hash(entry)
            this.add(entry)
        }
        return this
    }

    /**
     *
     * @param object
     * @returns {Collection}
     */
    addFromObject(object) {
        for (const [key, entry] of Object.entries(object)) {
            entry[this.key] = key
            this.add(entry)
        }
        return this
    }

    /**
     *
     * @param listener
     */
    addRangeChangeListener(listener) {
        this.on('added', entry => {
            listener([entry], [])
        })
        this.on('removed', entry => {
            listener([], [entry])
        })
    }
}

return module.exports = Collection
