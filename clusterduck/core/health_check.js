/**
 *
 * @type {function(*=, *): Promise<*>}
 */
const promiseWithTimeout = require('../misc/promise-with-timeout')

/**
 *
 * @type {((str: string, format?: Units) => (number | null)) | {readonly default: (str: string, format?: Units) => (number | null)}}
 */
const parseDuration = require('parse-duration')
const Entity = require("../misc/entity")
const Thread = require("./thread");

const debug = require('diagnostics')('health_checks')

/**
 * HealthCheck model
 */
class HealthCheck extends Entity {
    /**
     * Constructor
     * @param node
     * @param config
     * @param path
     */
    constructor(node, config, path) {
        super()
        this.node = node
        this.config = config
        this.path = path
        this.last_triggered = null
    }

    /**
     * Is this health check due to be triggered?
     * @returns {boolean}
     */
    get due() {
        return this.last_triggered == null || (this.last_triggered + parseDuration(this.config.every) < Date.now())
    }

    /**
     * Trigger this health check if it is due
     * @returns {Promise<* | void>}
     */
    triggerIfDue() {
        if (!this.due) {
            return
        }
        return this.trigger()
    }


    get thread() {
        return this.node.cluster.clusterduck.threads.thread
    }

    /**
     * Trigger this health check
     * @returns {Promise<* | void>}
     */
    trigger() {
        this.last_triggered = Date.now()
        this.result = null

        const timeoutMs = parseDuration(this.config.timeout)
        // promiseWithTimeout hard caps the execution time
        return promiseWithTimeout(
            timeoutMs,
            this.thread.run(this.path, [this.node.export(), this.config, timeoutMs])
        ).finally(() => {

        }).catch(error => {
            if (this.result == null) {
                this.result = error
            }
            throw error
        }).then(result => {

        })
    }
}

return module.exports = HealthCheck
