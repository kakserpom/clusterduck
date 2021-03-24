const net = require('net'),
    path = require('path')

const Parser = require("redis-parser");

const createServer = onCommand => {
    return net.createServer({}, connection => {

        class Response {
            constructor(stream) {
                this.stream = stream
            }

            encode(value) {
                var that = this;
                if (Array.isArray(value)) {
                    this.stream.write('*' + value.length + '\r\n');
                    value.forEach(function (v) {
                        that.encode(v);
                    });
                } else if (value === null) {
                    this.stream.write('$-1\r\n');
                }
                else {
                    switch (typeof value) {
                        case 'number':
                            this.stream.write(':' + value + '\r\n');
                            break;
                        case 'boolean':
                            this.stream.write(':' + (value ? '1' : '0') + '\r\n');
                            break;
                        default:
                            const b = new Buffer.from(value);
                            this.stream.write('$' + b.length + '\r\n');
                            this.stream.write(b);
                            this.stream.write('\r\n');
                            break;
                    }
                }
            }

            error(msg) {
                this.stream.write('-' + msg + '\r\n');
            }

            singleline(line) {
                this.stream.write('+' + line + '\r\n');
            }
        }

        const response = new Response(connection)

        const parser = new Parser({
            returnReply(reply) {
                onCommand.call(response, reply)
            },
            returnError(err) {
                onCommand.call(response, err)
            },
            returnFatalError(err) {
                onCommand.call(response, err)
            }
        })
        connection.on('data', data => {
            try {
                parser.execute(data)
            } catch (e) {
                console.error(e)
            }
        });
    })
}
return module.exports = {createServer}
