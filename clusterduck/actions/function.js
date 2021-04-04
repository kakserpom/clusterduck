const isObject = require("is-obj");
const {quote} = require('shell-quote')
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
            const exec = this._exec_shell_command
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

module.exports = FunctionAction
