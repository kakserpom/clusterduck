const Collection = require("../../misc/collection")

class ClusterNodes extends Collection {
    /**
     *
     * @returns {*[]}
     */
    get active() {
        return this.filter(node => node.active)
    }
}
return module.exports = ClusterNodes
