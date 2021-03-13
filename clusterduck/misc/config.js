const YAML = require('js-yaml')

const PrettyYaml = require('./pretty-yaml')
const writeFileAtomic = require('write-file-atomic')
const cloneDeep = require('clone-deep')
const fs = require('fs')

const emitter = require('events').EventEmitter

class ConfigFile extends emitter {
    constructor(path) {
        super()
        this.path = path
        this.load()
        return new Proxy(this, {
            get: (target, prop) => {
                return this[prop] || target.data[prop]
            },
            set: (target, prop, value) => target.data[prop] = value,
        })
    }

    load() {
        this.data = YAML.load(fs.readFileSync(this.path, 'utf8'))
    }

    async write() {

        const prepare = config => {
            if (config.clusters) {
                for (const [key, cluster] of Object.entries(config.clusters)) {
                    delete cluster.name
                    cluster.health_checks && cluster.health_checks.forEach(item => delete item.id)
                    cluster.balancers && Object.entries(cluster.balancers)
                        .forEach(([key, item]) => delete item.name)
                    cluster.triggers && cluster.triggers.forEach(item => delete item.id)
                }
            }
            return config
        }

        await writeFileAtomic(fs.realpathSync(this.path), PrettyYaml.stringify(prepare(cloneDeep(this.data))))
    }
}

return module.exports = ConfigFile