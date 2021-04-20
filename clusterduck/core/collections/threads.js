const Collection = require("../../misc/collection")
const Thread = require("../thread");

/**
 *
 */
class Threads extends Collection {

    /**
     *
     */
    constructor(maxThreads) {
        super('id', entry => {
            entry.id = ++this.seq
            return entry
        })
        this.seq = 0
        this.maxThreads = maxThreads
    }

    /**
     *
     * @returns {Thread|*}
     */
    get thread() {
        if (this.length < this.maxThreads) {
            const worker = new Thread
            this.add(worker)
            return worker
        } else {
            return this.get(this.keys()[Math.floor(Math.random() * this.length)])
        }
    }
}


module.exports = Threads

