const isObject = require('is-obj')
module.exports = () => {
    process
        .on('uncaughtException', (err, origin) => {
            console.log('Uncaught Exception:', err, 'origin:', origin)
            console.error('Uncaught Exception:', err, 'origin:', origin)
        })
        .on('unhandledRejection', (reason, promise) => {
            if (isObject(reason)) {
                if (reason.name) {
                    process.emit('unhandledRejection:' + reason.name, reason)
                }
                if (reason.hide) {
                    return
                }
            }
            console.log('Unhandled Rejection at:', promise, 'reason:', reason)
            console.error('Unhandled Rejection at:', promise, 'reason:', reason)
        })
}
