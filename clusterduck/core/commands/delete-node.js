const Command = require('./command')
const YAML = require("js-yaml")

/**
 *
 */
class DeleteNode extends Command {

    /**
     * Constructor
     */
    constructor(hydrated) {
        super(hydrated)

        if (hydrated) {
            return
        }

        this.command = 'delete-node'
    }

    /**
     * Set target node
     * @param node
     * @returns {UpdateNode}
     */
    target(node) {
        this.path = node.path()
        return this;
    }

    /**
     *
     * @param root
     */
    run(root) {
        const node = root.resolveEntityPath(this.path)
        if (node) {
            node.cluster.nodes.remove(node)
        }
    }
}


DeleteNode.cliCommand = (yargs, clusterduck) => {
    yargs.command(
        'delete-node [cluster] [addr]',
        'Delete a node with [addr] from [cluster]',
        yargs => {
            yargs
                .positional('cluster', {
                    describe: 'cluster name',
                    demandOption: true
                })
                .positional('addr', {
                    describe: 'Node address',
                    demandOption: true
                })
        },
        async argv => {
            const client = await clusterduck.jayson.client()

            const args = [
                argv.cluster,
                YAML.load(argv.addr)
            ]
            const {error, result} = await client.request('deleteNode', args)
            if (error) {
                console.error(clusterduck.argv.verbose ? error : error.message)
                return
            }
            process.stdout.write(YAML.dump(result))
        }
    )
}

return module.exports = DeleteNode

