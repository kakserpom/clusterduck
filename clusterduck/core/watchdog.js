const fs = require("fs");
const {spawn} = require('node-pty')

class Watchdog {

    /**
     *
     * @param path
     * @param args
     */
    constructor(path, args) {
        this.path = path
        this.args = args
        this.autoRestart = true
    }

    run() {
        const proc = spawn(this.path, this.args)
        proc.onData(data => {
            console.error(data)
        });
        proc.onExit(() => {
            if (this.autoRestart) {
                this.run()
            }
        });
        ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGUSR1', 'SIGUSR2'].forEach(signal => process.on(signal, () => proc.kill(signal)))
    }
}

module.exports = Watchdog
