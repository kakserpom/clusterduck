const exec = require('child_process').exec

/**
 *
 */
class FunctionAction {

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
     * @param args
     */
    async invoke(env, ...args) {
        try {
            const os = require('os')
            const exec = this._exec_shell_command.bind(this)
            const cwd = this.config.cwd || process.cwd()
            await eval('(async ' + this.config.func + ')')(...args)
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Executes a shell command and return it as a Promise.
     * @param cmd {string}
     * @param options
     * @return {Promise<string>}
     */
    _exec_shell_command(cmd, options) {
        options = options || {}
        options.cwd = options.cwd || this.config.cwd || process.cwd()
        return new Promise((resolve, reject) => {
            exec(cmd, options, (error, stdout, stderr) => {
                if (error) {
                    this.debug('stderr: ', stdout)
                }
                this.debug('stdout: ', stdout)
                resolve(stdout ? stdout : stderr);
            });
        });
    }
}

module.exports = FunctionAction
