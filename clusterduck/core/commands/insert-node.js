const Command = require('./command')
const YAML = require("js-yaml");

/**
 *
 */
class InsertNode extends Command {

    /**
     * Constructor
     */
    constructor(hydrated) {
        super(hydrated)

        if (hydrated) {
            return
        }

        this.command = 'insert-node'
        this.once('beforeCommit', () => {

        })
    }

    /**
     * Set target cluster
     * @param cluster
     * @returns {UpdateNode}
     */
    target(cluster) {
        this.path = cluster.path()

        return this;
    }

    define(definition) {
        this.definition = definition
        return this
    }

    /**
     *
     * @param root
     */
    run(root) {
        const cluster = root.resolveEntityPath(this.path)

        cluster.nodes.add(this.definition)
    }
}

InsertNode.cliCommand = (yargs, clusterduck) => {
    yargs.command(
        'insert-node [cluster] [node]',
        'Insert a new [node] into [cluster]',
        yargs => {
            yargs
                .positional('cluster', {
                    describe: 'cluster name',
                    demandOption: true
                })
                .positional('node', {
                    describe: 'node (yaml/json)',
                    demandOption: true
                })
        },
        yargs => {
            clusterduck._command = () => {
                return new Promise(async (resolve, reject) => {
                    const client = await clusterduck.jayson.client()

                    const args = [
                        yargs.cluster,
                        YAML.load(yargs.node)
                    ]
                    const {error, result} = await client.request('insertNode', args)
                    if (error) {
                        console.error(clusterduck.argv.verbose ? error : error.message)
                        return
                    }
                    process.stdout.write(YAML.dump(result))
                })
            }
        }
    )
}

return module.exports = InsertNode
