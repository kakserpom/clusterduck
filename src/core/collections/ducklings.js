/**
 *
 * @type {SetConstructor|(function(*=, *=, *=, *=): *)}
 */
const Set = require('collections/set')

/**
 * Ducklings collection
 */
class Ducklings extends Set {

    /**
     *
     * @param clusterduck
     * @param ducklings
     */
    constructor(clusterduck, ducklings) {
        super(ducklings)
        this.clusterduck = clusterduck

        this.addRangeChangeListener((plus) => {
            for (let i = 0; i < plus.length; ++i) {
                plus[i].on('disconnect', (duckling) => {
                    this.delete(duckling)
                })
            }
        })
    }
}

return module.exports = Ducklings
