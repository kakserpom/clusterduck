const yaml = require('js-yaml')
const fs   = require('fs')

try {
    const doc = yaml.load(fs.readFileSync('envoy.yaml', 'utf8'));
    console.log(JSON.stringify(doc))
} catch (e) {
    console.log(e);
}