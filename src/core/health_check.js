const promiseWithTimeout = require('../misc/promise-with-timeout')
const parseDuration = require('parse-duration')
class HealthCheck {
    constructor(node, config) {
        this.node = node
        this.config = config
        this.lastTriggered = null
    }

    get due() {
        return this.lastTriggered == null || (this.lastTriggered + parseDuration(this.config.every) < Date.now())
    }

    triggerIfDue() {
        if (!this.due) {
            return
        }
        return this.trigger()
    }

    trigger() {
        this.lastTriggered = Date.now()
        this.result = null

        const hc = this

        return promiseWithTimeout(
            parseDuration(this.config.timeout),
            this.node.cluster.get_health_check(this.config.type).apply(this)
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

