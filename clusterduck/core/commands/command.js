const emitter = require('eventemitter2')

/**
 *
 */
class Command  {

    /**
     *
     * @param hydrated
     */
    constructor(hydrated) {
        this._ev = new emitter()

        if (!hydrated) {
            this._ev.once('beforeCommit', () => {
                this.timestamp = Date.now()
            })
        }
    }

    emit() {
        return this._ev.emit(...arguments)
    }

    run(root) {
        throw new Error('run() must be implemented')
    }

    get skip() {
        return false
    }
}

Command.hydrate = obj => {
    const constructor = require('./' + obj.command)
    const command = new constructor(true)
    for (const [key, value] of Object.entries(obj)) {
        command[key] = value
    }
    return command
}
Command.dehydrate = command => {
    if (!command) {
        return null
    }
    let obj = {}
    for (const [key, value] of Object.entries(command)) {
        if (!key.match(/^_/)) {
            obj[key] = value
        }
    }
    return obj
}
return module.exports = Command
