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
     * @param ...args
     */
    async invoke(env, ...args) {

        const options = {
            env: this.config.inherit_env ? process.env : {PATH: process.env.PATH},
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


        let out = ''

        for (const command of this.config.commands) {

            console.log({
                env: options.env,
                command
            })

            this.debug('TRIGGER:', envString, command)
            const commandOutput = await this._exec_shell_command(command, options)
            this.debug('OUTPUT: ', commandOutput)
            out += commandOutput
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
                console.log(stdout)
                console.log(stderr)
                resolve(stdout ? stdout : stderr);
            });
        });
    }

}

return module.exports = ShellAction
