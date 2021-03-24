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


    /**
     * Trigger this health check
     * @returns {Promise<* | void>}
     */
    trigger() {
        this.last_triggered = Date.now()
        this.result = null

        const hc = this

        const {Worker} = require('worker_threads')

        const timeoutMs = parseDuration(this.config.timeout)

        const workerData = {
            config: this.config,
            node: this.node.export(),
            timeoutMs,
        }

        const worker = new Worker(this.path, {
            workerData
        })
        worker.unref()
        const promise = new Promise((resolve, reject) => {
            worker.on('message', data => {
                // @todo: implement misc. data
            })
            worker.on('error', error => {
                debug([error, workerData])
                reject({error, hc: this.config})
            })
            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                } else {
                    resolve({})
                }
            })
        })

        // promiseWithTimeout hard caps the execution time
        return promiseWithTimeout(
            timeoutMs,
            promise
        )
            .finally(() => {


            })
            .catch(e => {
                if (hc.result == null) {
                    hc.result = e
                }
                throw e;
            }).then(result => {
                //console.log(result);
            })
    }
}

return module.exports = HealthCheck
