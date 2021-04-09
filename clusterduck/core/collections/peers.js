const Collection = require("../../misc/collection")

class Peers extends Collection {
    constructor(key, hydrate) {
        super(key, hydrate)
        this.setExportMode('object')
    }
}

module.exports = Peers
