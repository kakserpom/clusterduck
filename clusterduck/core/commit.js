const Command = require('./commands/command')
const {v4: uuidv4} = require('uuid')
class Commit {

    /**
     *
     */
    constructor(commands, id) {

        this.commands = []
        this.add(...(commands || []))
        this.id = id || uuidv4()
        this.executed = false
    }

    get length() {
        return this.commands.length
    }

    /**
     *
     */
    add() {
        Array.from(arguments).map(command => {
            command.emit('beforeCommit')
            if (!command.skip) {
                this.commands.push(command)
            }
        })
    }


    /**
     *
     * @returns {{commands: *[]}}
     */
    bundle() {
        return {
            id: this.id,
            commands: this.commands.map(command => Command.dehydrate(command)).filter(x => x)
        }
    }

    /**
     *
     * @param root
     */
    execute(root) {
        if (this.executed) {
            return
        }
        this.executed = true
        root.emit('commit:' + this.id, this)
        this.commands.map(command => command.run(root))
    }

}
Commit.fromBundle = bundle => {
    const commit = new Commit(null, bundle.id)
    bundle.commands.map(entry => {
        commit.add(Command.hydrate(entry))
    })
    return commit
}

return module.exports = Commit