const Command = require('./command')
const YAML = require("js-yaml");

/**
 *
 */
class EmitEvent extends Command {

    /**
     * Constructor
     */
    constructor(hydrated) {
        super(hydrated)

        if (hydrated) {
            return
        }

        this.command = 'emit-event'
        this.once('beforeCommit', () => {

        })
    }

    /**
     *
     * @param entity
     * @returns {EmitEvent}
     */
    target(entity) {

        if (!entity.path) {
            throw new TypeError('object does not implement path()')
        }

        this.path = entity.path()

        if (!entity.emit) {
            throw new TypeError('object does not implement emit()')
        }

        return this
    }

    define(event, ...args) {
        this.definition = [event, ...args]
        return this
    }

    /**
     *
     * @param root
     */
    run(root) {
        const entity = root.resolveEntityPath(this.path)
        entity.emit(...this.definition)
    }
}
return module.exports = EmitEvent
