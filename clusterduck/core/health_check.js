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
        this.in_progress = false
    }

    /**
     * Is this health check due to be triggered?
     * @returns {boolean}
     */
    get due() {

        if (this.in_progress) {
            return false
        }

        if (this.trigger_at === null) {
            return true
        }

        if (this.trigger_at < Date.now()) {
            return true
        }

        return false
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
     *
     * @param key
     * @param withState
     * @returns {*}
     * @private
     */
    _exportable(key, withState) {
        if (key !== 'node') {
            return super._exportable(key, withState)
        }
    }

    /**
     * Trigger this health check
     * @returns {Promise<* | void>}
     */
    trigger() {
        this.in_progress = true
        this.trigger_at = Date.now() + parseDuration(this.config.interval || this.config.every)
        const timeoutMs = parseDuration(this.config.timeout)
        return timeout(
            this.thread.run(this.path, [this.node.export(), this.config, timeoutMs]),
            timeoutMs
        ).then(result => {
            this.in_progress = false
            this.node_attrs = result.node_attrs || {}
            this.error = null
            return result
        }, error => {
            this.in_progress = false
            console.log(error)
            this.node_attrs = {}
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
