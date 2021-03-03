const { SHAKE } = require('sha3');
return module.exports = function (array, callback) {
    if (callback === 'hash') {
        callback = function(item) {
            const hash = new SHAKE(128)
            hash.update(JSON.stringify(item))
            return hash.digest('hex')
        };
    }
    let object = {}
    array.forEach(function(item) {
        object[callback(item)] = Object.assign({}, item);
    })
    return object
}