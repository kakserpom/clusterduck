const net = require('net'),
    path = require('path')

const {Response} = require('redis-protocol/lib/encoder')

const hiredis = require("hiredis")

const createServer = function(onCommand) {
    return net.createServer({}, function(connection) {
        const reader = new hiredis.Reader()
        const response = new Response(connection)
        connection.on('data', function(data) {
            try {
                reader.feed(data)
                let reply
                while ((reply = reader.get()) != null) {
                    onCommand.call(response, reply)
                }
            } catch (e) {
                console.log(e)
            }
        });
    })
}

exports.createServer = createServer;
