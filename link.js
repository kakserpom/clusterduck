const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const packages = []
const execAndPrint = (cmd) => {
    console.log(cmd)
    return exec(cmd)
}
fs.readdir('.', async (err, files) => {
    files.forEach(file => {
        if (file.match(/^clusterduck-/)) {
            packages.push(file)
        }
    });

    for (let i = 0; i < packages.length; ++i) {
        await execAndPrint(`cd ${package}; npm link; cd -`);
    }
})
