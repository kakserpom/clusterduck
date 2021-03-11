const fs = require('fs')
class PidFile {

    constructor(path) {
        this.path = path
    }

    get pid() {
        if (!fs.existsSync(this.path))  {
            return false
        }
        return fs.readFileSync(this.path);
    }
    get running() {
        try {
            const pid = this.pid
            if (!pid) {
                return false
            }
            try {
                process.kill(pid, 0)
                return true
            } catch (e) {
                return false
            }
        } catch (e) {
            throw e
        }
    }

    stop() {
        if (!this.running) {
            throw new Error('Daemon does not seem to be running')
        }

        process.kill(this.pid)
    }

    acquire() {
        for (let i = 0; i < 5; ++i) {
            if (this.running) {
                return false
            }
            try {
                fs.writeFileSync(this.path, process.pid.toString(), {flag: 'wx+'})
                process.on('exit',  () => {
                    fs.unlinkSync(this.path)
                })
                return true
            } catch (e) {
                if (e.code === 'EACCES') {
                    throw e
                }
                if (this.running) {
                    return false
                }
                fs.existsSync(this.path) && fs.unlinkSync(this.path)
            }
        }
        throw new Error('Something went wrong')
    }

    acquireOrThrow() {
        if (!this.acquire()) {
            throw new Error('An instance seems to be running already (' + this.path + ')')
        }
        return true
    }
}

return module.exports = PidFile
