const {quote} = require('shell-quote')
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
     * @returns {Promise<void>}
     * @param env
     */
    async invoke(env) {
        const options = {};
        if (this.config.cwd != null) {
            options.cwd = this.config.cwd
        }
        options.env = Object.assign({}, this.config.env || {}, env)
        debug('Triggering shell:', this.config.commands, options.env)
        for (const command of this.config.commands) {
            await this._exec_shell_command(command, options)
        }
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
