return module.exports = (addr, default_port) => {
    if (!addr.match(/^\/|:\/\//)) {
        addr = 'tcp://' + addr
    }
    const u = new URL(addr)
    if (u.scheme === 'tcp') {
        u.port = u.port || default_port
    }
    if (u.host && u.port) {
        u.host = u.hostname + ':' + u.port;
    }
    return u
}
