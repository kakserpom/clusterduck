const Collection = require("../../misc/collection")
const Thread = require("../thread");

/**
 *
 */
class Threads extends Collection {

    /**
     *
     */
    constructor() {
        super('id', entry => {
            entry.id = ++this.seq
            return entry
        })
        this.seq = 0
    }

    /**
     *
     * @returns {Thread|*}
     */
    get thread() {
        if (this.length < 4) {
            const worker = new Thread
            this.add(worker)
            return worker
        } else {
            return this.get(this.keys()[Math.floor(Math.random() * this.length)])
        }
    }
}


return module.exports = Threads

