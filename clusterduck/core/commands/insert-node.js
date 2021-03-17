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
    yargs.command('insert-node [cluster] [node]',
        'Insert a new [node] into [cluster]',
        yargs => {
            yargs
                .positional('cluster', {
                    describe: 'cluster name',
                    demandOption: true
                })
                .positional('node', {
                    describe: 'Node definition (YAML/JSON)',
                    demandOption: true
                })
        },
        async argv => {
            try {
                const client = await clusterduck.jayson.client()
                const {error, result} = await client.request('insertNode', [
                    argv.cluster,
                    YAML.load(argv.node)
                ])
                if (error) {
                    throw error
                }
                process.stdout.write(YAML.dump(result))
            } catch (e) {
                console.error(clusterduck.verbose ? e : e.message)
            } finally {
                process.exit(0)
            }
        })
}

return module.exports = InsertNode
