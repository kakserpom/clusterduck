const fs = require('fs')
class Dashboard {
    constructor(http, config) {
        http.on('listen', () => {
            const path = require('path')
            http.fastify.register(require('fastify-static'), {
                root: path.join(__dirname, 'build', 'static'),
                prefix: '/static/',
                list: true
            })
            http.fastify.get('*', async (req, reply) => {
                if (req.url.match(/^\/\w+\.\w+$/)) {
                    reply.sendFile(req.url.substr(1), __dirname + '/build')
                } else {
                    reply.sendFile('index.html', __dirname + '/build')
                }
            })
        })
    }
}

module.exports = Dashboard
