const Balancer = require('clusterduck/core/balancer')
const Collection = require("clusterduck/misc/collection");
const {Worker, isMainThread} = require('worker_threads')

/**
 *
 */
class NativeBalancer extends Balancer {

    /**
     * Constructor
     */
    init() {

        if (!this.cluster.clusterduck.argv.experimental) {
            throw new Error('clusterduck-redis: the native balancer is EXPERIMENTAL, --experimental is required')
        }

        // Let's keep HashRing always up-to-date
        this.cluster.nodes.on('changed', (node, state) => {

            if (state && state.active) {

                this.workers.forEach(worker => worker.postMessage(
                    ['addNode', node.export(true)]
                ))
            } else {
                this.workers.forEach(worker => worker.postMessage(
                    ['removeNode', node.export(true)]
                ))
            }
        })

        this.workers = new Collection()
    }

    _exportable(key, withState) {
        if (key !== 'workers') {
            return super._exportable(key, withState)
        }
    }


    /**
     * Start a balancer
     */
    start() {
        this.startWorker()
    }

    startWorker() {
        const worker = new Worker(__dirname + '/bin/redis-native-lb.js', {
            workerData: {}
        })

        worker.on('message', message => {
            console.log(message)
        });
        worker.on('error', error => {
            console.error(error)
        });
        worker.on('exit', code => {
            console.log('exit ' + code)
        });

        this.cluster.nodes.active.map(node => worker.postMessage(['addNode', node]))

        worker.postMessage(
            ['listen', this.config.listen]
        )
        this.workers.add(worker)
    }
}

module.exports = NativeBalancer
