const crypto = require('crypto')
const timingSafeEqual = (a, b) => {
    a = Buffer.from(a)
    b = Buffer.from(b)
    return a.byteLength === b.byteLength && crypto.timingSafeEqual(a, b)
}
module.exports = timingSafeEqual
