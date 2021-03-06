const emitter = require('events').EventEmitter

class Duckling extends emitter {
    constructor(callback) {
        super()
        this.process = require('cluster').fork().on('online', () => {
            callback(this)
        })
            .on('disconnect', () => this.emit('disconnect', this))
            .on('message', msg => {
                this.emit(msg.event, ...(msg.args || []))
            })
    }

    notify(evName, ...args) {
        this.process.send({
            event: evName,
            args: args
        })
    }
}

Duckling.notifyParent = function (evName, args) {
    process.send({
        event: evName,
        args: args
    })
}
Duckling.isDuckling = require('cluster').isWorker
Duckling.events = new emitter
Duckling.events.listen = function () {
    console.log('listen')
    process.on('message', msg => Duckling.events.emit(msg.event, ...msg.args))
}

return module.exports = Duckling
