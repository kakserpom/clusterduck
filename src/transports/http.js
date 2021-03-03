const http = require('http')
const yaml = require('js-yaml')
/**
 *
 */
class Http {

    /**
     *
     * @param config
     * @param clusterduck
     */
    constructor(config, clusterduck) {
        this.config = config
        this.clusterduck = clusterduck
    }

    listen() {
        const api = this
        const port = this.config.listen || 8485

        const express = require('express')
        const app = express()

        app.get('/', (req, res) => {
            res.send('Hello World!')
        })

        //app.listen(port)
    }
}

return module.exports = Http

