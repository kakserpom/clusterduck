/**
 *
 */
class Majority {

    /**
     *
     */
    constructor() {
        this.values = new Map
        this.values[Symbol.iterator] = function* () {
            yield* [...this.entries()].sort((b, a) => a[1] - b[1]);
        }
    }

    /**
     *
     * @param value
     */
    feed(value) {
        this.values.set(value, (this.values.get(value) || 0) + 1)

    }

    /**
     *
     * @returns {any}
     */
    value(defaultValue) {
        for (const [value, votes] of this.values) {
            return value
        }
        return defaultValue
    }
}
return module.exports = Majority
