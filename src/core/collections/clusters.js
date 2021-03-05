const Dict = require('collections/dict')
const Duckling = require('../duckling')


/**
 *
 */
class Clusters extends Dict {
    constructor(clusterduck, clusters) {
        super()
        this.clusterduck = clusterduck
        for (const [name, config] of Object.entries(clusters)) {
            const constructor = require('../../clusters/' + config.type)
            this.set(name, new constructor(config, name, this.clusterduck))
        }

        if (Duckling.isDuckling) {
            Duckling.events.on('run-balancer', params => {
                this.get(params.cluster).balancers[params.balancers].listen()
            })
        }
    }

    run_health_checks() {
        this.forEach(cluster => cluster.run_health_checks())
    }
}

return module.exports = Clusters
