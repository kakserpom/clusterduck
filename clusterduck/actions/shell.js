const quote = require('shell-quote').quote
const exec = require('child_process').exec
const debug = require('diagnostics')('triggers')

/**
 *
 */
class ShellAction {

    /**
     *
     * @param config
     */
    constructor(config) {
        this.config = config
    }

    /**
     *
     * @param params
     * @returns {Promise<void>}
     */
    async invoke(callback) {
        const commands = this._prepare_commands(this.config.commands, callback || (() => {}));

        debug('Triggering shell:', commands)

        const options = {};
        if (this.config.cwd != null) {
            options.cwd = this.config.cwd
        }
        for (const command of commands) {
            await this._exec_shell_command(command, options)
        }
    }

    /**
     *
     * @param commands
     * @param params
     * @returns {*}
     * @private
     */
    _prepare_commands(commands, callback) {
        return commands.map(function (command) {
            return command.replace(/\$(nodes_active_addrs)/, function (match, variable) {

                const value = callback(variable)
                if (value !== undefined) {
                    return quote([value])
                }

                return match
            })
        })
    }

    /**
     * Executes a shell command and return it as a Promise.
     * @param cmd {string}
     * @param options
     * @return {Promise<string>}
     */
    _exec_shell_command(cmd, options) {
        return new Promise((resolve, reject) => {
            exec(cmd, options || {}, (error, stdout, stderr) => {
                if (error) {
                    console.warn(error);
                }
                resolve(stdout ? stdout : stderr);
            });
        });
    }

}

return module.exports = ShellAction
