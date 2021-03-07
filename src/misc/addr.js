const url = require('url')

return module.exports = (addr, default_port) => {
    if (!addr.match(/^\/|:\/\//)) {
        addr = 'tcp://' + addr
    }
    const u = url.parse(addr, true)
    if (u.scheme === 'tcp') {
        u.port = u.port || default_port
    }
    if (u.host && u.port) {
        u.host = u.hostname + ':' + u.port;
    }
    return u
}
