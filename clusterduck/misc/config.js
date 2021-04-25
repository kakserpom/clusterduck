const YAML = require('js-yaml')

const PrettyYaml = require('json-to-pretty-yaml')
const writeFileAtomic = require('write-file-atomic')
const cloneDeep = require('clone-deep')
const fs = require('fs')

const emitter = require('eventemitter2')

class ConfigFile extends emitter {
    constructor(path) {
        super()
        this.path = path
    }

    async load() {
        const contents = await fs.promises.readFile(this.path, 'utf8')

        function File(path) {
            this.path = path
        }

        const FileYamlType = new YAML.Type('!file', {
            kind: 'scalar',
            resolve: path => typeof path === 'string',
            construct: path => new File(path),
            instanceOf: File,
            represent: file => file.path,
        })

        const schema = YAML.DEFAULT_SCHEMA.extend([FileYamlType]);
        this.data = YAML.load(contents, {schema})
    }

    getData() {
        return this.data
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

        const output = PrettyYaml.stringify(prepare(cloneDeep(this.data)))

        try {
            await writeFileAtomic(fs.realpathSync(this.path), output)
        } catch (e) {
            console.warn('Caught exception:', e)
        }
    }
}

ConfigFile.fromString = str => YAML.load(str)

module.exports = ConfigFile
