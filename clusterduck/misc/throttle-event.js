const throttleEvent = (callback, ms) => {
    let timeout
    return (...args) => {
        if (timeout) {
            return
        }
        timeout = setTimeout(() => {
            timeout = null
            callback(...args)
        }, ms || 1)
    }
}
module.exports = throttleEvent
