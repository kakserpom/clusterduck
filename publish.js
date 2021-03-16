const util = require('util')
const exec = util.promisify(require('child_process').exec)
const fs = require('fs')
const packages = []
fs.readdir('.', async (err, files) => {
    files.forEach(file => {
        if (file.match(/^clusterduck(-[\w+\-_]+)?$/)) {
            packages.push(file)
        }
    });

    for (let i = 0; i < packages.length; ++i) {
        const pkg = packages[i]
       console.log(await exec(' cd ${pkg}; npm publish; cd -'))
    }
})
