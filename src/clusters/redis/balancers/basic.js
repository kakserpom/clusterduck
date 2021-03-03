const Balancer = require('../../../core/balancer')
const Parser = require('redis-parser')
const net = require('net')
class BasicBalancer extends Balancer {
    listen() {
        class Connection {
            constructor(stream) {
                const conn = this;
                this.stream = stream;

                this.parser = new Parser({
                    returnReply(reply) {
                        conn.returnReply(reply)
                    },
                    returnError(err) {
                        conn.returnError(err)
                    },
                    returnFatalError(err) {
                        conn.returnFatalError(err)
                    }
                })

            }
            returnReply(reply) { /* ... */ }
            returnError(err) { /* ... */ }
            returnFatalError(err) { /* ... */ }

            streamHandler() {
                this.stream.on('data', (buffer) => {
                    // Here the data (e.g. `Buffer.from('$5\r\nHello\r\n'`))
                    // is passed to the parser and the result is passed to
                    // either function depending on the provided data.
                    this.parser.execute(buffer)
                });
            }
        }

        const server = net.createServer(function(socket) {
            const connection = new Connection(socket)

            clients.add(connection)
        });

        server.listen(this.config.listen)
    }
}