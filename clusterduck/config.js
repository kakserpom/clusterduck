const YAML = require('yaml')
const fs = require('fs')
return module.exports = function(file) {
    return YAML.parse(fs.readFileSync(file, 'utf8'))
};