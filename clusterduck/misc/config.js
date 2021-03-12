const YAML = require('js-yaml')
const fs = require('fs')
return module.exports = function(file) {
    return YAML.load(fs.readFileSync(file, 'utf8'))
}
