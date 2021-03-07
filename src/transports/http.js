const http = require('http')
const yaml = require('js-yaml')
/**
 *
 */
class Http {
    doListen() {
        const api = this
        const port = this.listen || 8485

        const express = require('express')
        const app = express()

        app.get('/', (req, res) => {
            res.send('Hello World!')
        })

        //app.listen(port)
    }
}

return module.exports = Http

