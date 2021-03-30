const isObject = require("is-obj");
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

        const options = {
            env: {},
        }

        if (this.config.cwd != null) {
            options.cwd = this.config.cwd
        }

        (Object.entries(this.config.env || {}).concat(Object.entries(env || {})))
            .map(([key, value]) => {
                if (isObject(value) && isObject(options.env[key])) {
                    value = Object.assign({}, options.env[key] || {}, value)
                }
                options.env[key] = typeof value === 'string' ? value : JSON.stringify(value)
            })


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
