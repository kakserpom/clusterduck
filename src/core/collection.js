/**
 *
 * @type {SetConstructor|(function(*=, *=, *=, *=): *)}
 */
const SortedSet = require('collections/sorted-set')
const { SHAKE } = require('sha3');

/**
 *
 */
class Collection extends SortedSet {

    /**
     *
     * @param key
     * @param hydrate
     */
    constructor(key, hydrate) {
        super(null, (a, b) => {
            return (typeof a === 'object' ? a[this.key] : a) === (typeof b === 'object' ? b[this.key] : b);
        }, a => {
            return typeof a === 'object' ? a[this.key] : a
        })
        this.key = key
        this.hydrate = hydrate || (entry => entry);

        const add = this.add;
        this.add = (entry) => {
            return add.apply(this, [this.hydrate(entry)])
        }

        this.hash = obj => {
            const hash = new SHAKE(128)
            hash.update(JSON.stringify(obj))
            return hash.digest('hex')
        }

        this.addFromArray = array => {
            for (const [i, entry] of Object.entries(array)) {
                entry[this.key] = entry[this.key] || this.hash(entry)
                this.add(entry)
            }
            return this
        }

        this.addFromObject = object => {
            for (const [key, entry] of Object.entries(object)) {
                entry[this.key] = key
                this.add(entry)
            }
            return this
        }
    }
}

return module.exports = Collection
