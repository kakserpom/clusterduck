const Entity = require('./entity')
const {SHAKE} = require('sha3');
const emitter = require('events').EventEmitter
const isObject = require('is-obj')

class Collection extends emitter {
    constructor(key, hydrate) {
        super()
        this._map = new Map()
        this.key = key
        this.hydrate = hydrate || (entry => entry)

        this._exportMode = 'object'

        this.on('changed', () => this.emit('all'))
    }

    /**
     *
     * @param mode
     */
    setExportMode(mode) {
        if (!['array', 'object'].includes(mode)) {
            throw new Error('setExportMode(): illegal argument')
        }
        this._exportMode = mode
    }

    export(withState) {

        if (this._exportMode === 'array') {
            return this.map(value =>
                typeof value === 'object' && value instanceof Entity
                    ? value.export(withState)
                    : value
            )
        } else {
            const obj = {}

            this.forEach((value, key) => {
                if (typeof value === 'object') {
                    const entry = value instanceof Entity ? value.export(withState) : value
                    delete entry[this.key]
                    obj[key] = entry
                } else {
                    obj[key] = value
                }
            })
            return obj
        }
    }

    /**
     *
     * @param entry
     * @returns {string|*}
     * @private
     */
    extractKey(entry) {
        if (isObject(entry)) {
            return entry[this.key]
        } else {
            return entry
        }
    }

    /**
     *
     * @param key
     * @param value
     * @returns {Collection}
     */
    set(key, value) {
        const has = this._map.has(key)
        this._map.set(key, value)
        if (!has) {
            this.emit('inserted', value, key)
            this.emit('all')
        }
        return this
    }

    /**
     *
     * @returns {number}
     */
    get size() {
        return this._map.size
    }

    /**
     *
     * @returns {number}
     */
    get length() {
        return this._map.size
    }

    /**
     *
     * @returns {Collection}
     */
    clear() {
        this._map.clear()
        this.emit('all')
        return this
    }

    /**
     *
     * @returns {any[]}
     */
    keys() {
        return Array.from(this._map.keys())
    }

    /**
     * @param ...entries
     * @returns {Collection}
     */
    add() {
        for (let i = 0; i < arguments.length; ++i) {
            const object = this.hydrate(arguments[i])
            if (object === null) {
                continue
            }
            const key = this.extractKey(object)
            if (!this._map.has(key)) {
                this._map.set(key, object)
                this.emit('inserted', object)
            }
        }
        this.emit('all')
        return this
    }

    /**
     * @param ...entries
     * @returns {Collection}
     */
    remove() {
        return this.delete(...arguments)
    }

    /**
     * @param ...entries
     * @returns {Collection}
     */
    delete() {
        for (let i = 0; i < arguments.length; ++i) {
            const object = this.get(arguments[i])
            if (object) {
                this._map.delete(this.extractKey(object))
                this.emit('deleted', object)
            }
        }
        this.emit('all')
        return this
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
    mapObj(callback) {
        const obj = {}
        this._map.forEach((value, key) => {
            const ret = callback(value, key, this)
            if (ret) {
                const [key, value] = ret
                obj[key] = value
            }
        })
        return obj
    }

    /**
     *
     * @param callback
     * @returns {[]}
     */
    filter(callback) {
        const {constructor} = this
        const collection = new constructor(this.key, this.hydrate)
        this._map.forEach((value, key) => {
            if (callback(value, key, this)) {
                collection.set(key, value)
            }
        })
        return collection
    }

    /**
     *
     * @param callback
     * @returns mixed|undefined
     */
    one(callback) {
        let item
        this._map.forEach((value, key) => {
            if (callback(value, key, this)) {
                item = value
            }
        })
        return item
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
        this.on('inserted', entry => {
            listener([entry], [])
        })
        this.on('deleted', entry => {
            listener([], [entry])
        })
    }
}

return module.exports = Collection
