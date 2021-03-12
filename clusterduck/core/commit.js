const Command = require('./commands/command')
class Commit {

    /**
     *
     */
    constructor(commands) {
        this.commands = []
        this.add(...(commands || []))
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
            commands: this.commands.map(command => Command.dehydrate(command)).filter(x => x)
        }
    }

    /**
     *
     * @param root
     */
    run(root) {
        this.commands.map(command => command.run(root))
    }

}
Commit.fromBundle = bundle => {
    const commit = new Commit
    bundle.commands.map(entry => {
        commit.add(Command.hydrate(entry))
    })
    return commit
}

return module.exports = Commit