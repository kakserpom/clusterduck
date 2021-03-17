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

/**
 * HealthCheck model
 */
class HealthCheck extends Entity {
    /**
     * Constructor
     * @param node
     * @param config
     * @param execuet
     */
    constructor(node, config, execute) {
        super()
        this.node = node
        this.config = config
        this.execute = execute
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


    /**
     * Trigger this health check
     * @returns {Promise<* | void>}
     */
    trigger() {
        this.last_triggered = Date.now()
        this.result = null

        const hc = this

        // promiseWithTimeout hard caps the execution time
        return promiseWithTimeout(
            parseDuration(this.config.timeout),
            this.execute.apply(this)
        ).catch(function (e) {
            if (hc.result == null) {
                hc.result = e
            }
            throw e;
        }).then(function (result) {
            //console.log(result);
        })
    }
}

return module.exports = HealthCheck
