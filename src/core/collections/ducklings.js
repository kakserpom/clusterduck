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
     * @inheritDoc
     */
    constructor() {
        super(...arguments)
        this.addRangeChangeListener((plus) => {
            plus.map(duckling => {
                duckling.on('disconnect', () => {
                    this.delete(duckling)
                })
            })
        })
    }
}

return module.exports = Ducklings
