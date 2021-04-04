const {parentPort, workerData, isMainThread, Worker} = require('worker_threads')
const debug = require('diagnostics')('thread')

class Thread {
    constructor() {
        this.seq = 0
        this.requests = new Map
        const worker = new Worker(
            __filename,
            {
                workerData: {
                    timeout: 30e3
                }
            }
        )

        worker.unref()

        worker.on('message', data => {
            const {id, op, args} = data
            this.requests.get(id)[op](...args)
            this.requests.delete(id)
        })

        worker.on('error', error => {
            debug([error, workerData])
        })

        worker.on('exit', (code) => {
            this.requests.forEach(request => request.reject(new Error(`Worker stopped with exit code ${code}`)))
        })

        this.worker = worker
    }

    run(path, args) {
        return new Promise((resolve, reject) => {
            const id = ++this.seq
            this.requests.set(id, {resolve, reject})
            this.worker.postMessage(['run', {id, path, args}])
        })
    }

    exit() {
        this.worker.postMessage(['exit'])
    }
}

if (!isMainThread) {
    const uncaught = require('../misc/uncaught')
    uncaught()
    parentPort.on('message', async message => {
        try {
            const [command, payload] = message
            if (command === 'exit') {
                process.exit()
            } else if (command === 'run') {
                const {id, path, args} = payload
                try {
                    const execute = require(path)
                    const response = await execute(...args)
                    parentPort.postMessage({id, op: 'resolve', args: [response]})
                } catch (error) {
                    parentPort.postMessage({id, op: 'reject', args: [error]})
                }
            }
        } catch (error) {
            console.error(error)
        }
    })
} else {
    module.exports = Thread
}
