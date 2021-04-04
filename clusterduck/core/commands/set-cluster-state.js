const Command = require('./command')
const ClusterNode = require('../cluster_node')

/**
 * This command is used when a leader instance sends the current state to a new follower
 */
class SetClusterState extends Command {

    /**
     * Constructor
     */
    constructor(hydrated) {
        super(hydrated)

        if (hydrated) {
            return
        }

        this.command = 'set-cluster-state'
        this._ev.once('beforeCommit', () => {

        })

        this.nodes = []
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

    /**
     *
     * @param node
     * @returns {SetClusterState}
     */
    addNode(node) {
        this.nodes.push(node.export(true))
        return this
    }

    /**
     *
     * @param collection
     * @returns {SetClusterState}
     */
    addNodesFromCollection(collection) {
        collection.forEach(node => this.addNode(node))
        return this
    }

    /**
     *
     * @param root
     */
    run(root) {
        const cluster = root.resolveEntityPath(this.path)
        cluster.nodes.clear()
        cluster.nodes.add(...this.nodes.map(node => (new ClusterNode(null, cluster)).entry(node, true)))
        cluster.debug('set-cluster-state: ' + this.nodes.length + ' node(s) written')
        cluster.acceptCommits = true
    }
}

module.exports = SetClusterState
