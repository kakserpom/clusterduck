const util = require('util')
const exec = util.promisify(require('child_process').exec)
const fs = require('fs')
const packages = []
const execAndPrint = (cmd) => {
    console.log(cmd)
    return exec(cmd)
}
fs.readdir('.', async (err, files) => {
    files.forEach(file => {
        if (file.match(/^clusterduck(-[\w+\-_]+)?$/)) {
            packages.push(file)
        }
    });

    for (let i = 0; i < packages.length; ++i) {
        const pkg = packages[i]
        await execAndPrint(`cd ${pkg}; npm link --unsafe-perm; cd -`);
    }

    for (let i = 0; i < packages.length; ++i) {
        const pkg = packages[i]
        let link = []
        for (let j = 0; j < packages.length; ++j) {
            const pkgRight = packages[j]
            if (pkg === pkgRight) {
                continue
            }
            link.push(pkgRight)
        }
        await execAndPrint(`cd ${pkg}; npm link ${link.join(' ')} --unsafe-perm; cd -`);
    }
})
