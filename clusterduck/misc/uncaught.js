const isObject = require('is-obj')
return module.exports = () => {
    process
        .on('uncaughtException', e => {
            console.error('Uncaught exception', e)
        })
        .on('unhandledRejection', e => {
            if (isObject(e)) {
                if (e.name) {
                    process.emit('unhandledRejection:' + e.name, e)
                }
                if (!e.hide) {
                    console.error('Unhandled rejection', e)
                }
            } else {
                console.error('Unhandled rejection', e)
            }
        })
}