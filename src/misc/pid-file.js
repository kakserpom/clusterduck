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
            throw new Error('[WARN] server does not seem to be running')
        }

        process.kill(this.pid)
    }

    acquire() {
        for (let i = 0; i < 5; ++i) {
            if (this.running) {
                return false
            }
            try {
                fs.writeFileSync(this.path, process.pid, {flag: 'wx+'})
                const _this = this;
                process.on('exit', function () {
                    fs.unlinkSync(_this.path)
                })
                return true
            } catch (e) {
                fs.unlinkSync(this.path)
            }
        }
        throw new Error('[ERROR] something went wrong')
    }

    acquireOrThrow() {
        if (!this.acquire()) {
            throw new Error('[ERROR] An instance seems to be running already (' + this.path + ')')
        }
        return true
    }
}

return module.exports = PidFile
