const quote = require('shell-quote').quote

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
    async invoke(params) {
        const commands = this._prepare_commands(this.config.commands, {
            addrs: params.nodes.addrs()
        });

        console.log(commands)

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
    _prepare_commands(commands, params) {
        return commands.map(function (command) {
            return command.replace(/\$(nodes_addr_list)/, function (match, variable) {
                if (variable === 'nodes_addr_list') {
                    return quote([
                        JSON.stringify(
                            params.addrs
                        )
                    ])
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
        const exec = require('child_process').exec;
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
