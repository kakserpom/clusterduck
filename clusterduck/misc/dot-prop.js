const dotProp = require('dot-prop')
dotProp.escapeKeyProp = prop => prop.replace(/\./g, '\\.')
module.exports = dotProp
