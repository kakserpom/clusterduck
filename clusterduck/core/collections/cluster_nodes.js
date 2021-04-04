const Collection = require("../../misc/collection")

class ClusterNodes extends Collection {
    constructor(key, hydrate) {
        super(key, hydrate)

        this._exportMode = 'array'
    }
    /**
     *
     * @returns {*[]}
     */
    get active() {
        return this.filter(node => node.active)
    }
}
module.exports = ClusterNodes
