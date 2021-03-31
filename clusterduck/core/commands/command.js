const emitter = require('eventemitter2')

/**
 *
 */
class Command extends emitter {

    /**
     *
     * @param hydrated
     */
    constructor(hydrated) {
        super()

        if (!hydrated) {
            this.once('beforeCommit', () => {
                this.timestamp = Date.now()
            })
        }
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
