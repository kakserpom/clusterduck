/**
 *
 * @type {function(*=, *): Promise<*>}
 */
const {timeout, TimeoutError} = require('promise-timeout')

/**
 *
 * @type {((str: string, format?: Units) => (number | null)) | {readonly default: (str: string, format?: Units) => (number | null)}}
 */
const parseDuration = require('parse-duration')
const Entity = require("../misc/entity")

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
        this.trigger_at = null
    }

    /**
     * Is this health check due to be triggered?
     * @returns {boolean}
     */
    get due() {
        return this.trigger_at === null || this.trigger_at < Date.now()
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
        this.trigger_at = Date.now() + parseDuration(this.config.interval || this.config.every)
        const timeoutMs = parseDuration(this.config.timeout)
        return timeout(
            this.thread.run(this.path, [this.node.export(), this.config, timeoutMs]),
            timeoutMs
        ).then(result => {
            this.error = null
            return result
        }, error => {
            if (this.config.interval_after_fail) {
                this.trigger_at = Date.now() + parseDuration(this.config.wait_after_fail)
            }
            if (error instanceof TimeoutError) {
                error.message = 'Timed out'
            }
            this.error = error
            throw error
        })
    }
}

module.exports = HealthCheck
