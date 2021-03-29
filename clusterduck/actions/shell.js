const {quote} = require('shell-quote')
const exec = require('child_process').exec

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
        this.debug = require('diagnostics')('triggers')
    }

    /**
     *
     * @returns {Promise<void>}
     * @param env
     */
    async invoke(env) {

        console.log('invoked!')
        const options = {};
        if (this.config.cwd != null) {
            options.cwd = this.config.cwd
        }
        options.env = Object.assign({}, this.config.env || {}, env)

        let envString = Object.entries(options.env)
            .map(([key, value]) => key + '=' + quote([value]))
            .join(' ')

        for (const command of this.config.commands) {
            this.debug('TRIGGER:', envString, command)
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
