# clusterduck

`clusterduck` is a humble take on fault-tolerant cluster __monitoring__ and __balancing__ implemented in pure Javascript.



## [Raft] consensus algorithm

Ducks love them rafts. 

We run [Liferaft] over an encrypted TCP transport.

## Installation

Node 11.x is required.

```
npm -g clusterduck
```

## Table Of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Command-line](#command-line)
- [Events](#events)
  - [Node events](#node-events)
  - [Cluster events](#cluster-events)
- [Transports](#transports)
- [Dependencies](#dependencies)
- [License](#license)

## Configuration

The default config file path is `/etc/clusterduck.yaml`
Let's define a simple `Redis cluster.

```yaml
clusters:
  redis_cache:
    type: redis
    nodes:
      - addr: 127.0.0.1:6379
      - addr: 127.0.0.1:6380
```

Where `redis_cache` is the name of our new cluster.

Note that you can omit `nodes` if you want to add nodes dynamically.

Now let's set up a simple __health check__.

```yaml
    health_checks:
      - type: basic
        timeout: 1s
        every: 1s
```

Now every second each node in the cluster will get checked on.

Now let's live export the list of active nodes:

```yaml
    triggers:
      - on: [ nodes:active ]
        do:
          - type: shell
            cwd: /tmp
            commands:
              - "echo $nodes_addr_list > active_nodes.json"
```

This will make sure that `/tmp/nodes_list` always contains a current list of alive nodes.

## Command-line

Run the  `clusterduck` command to see if it all works for you.

If you want to daemonize it, run `clusterduck -d`

If you want to stop a running daemon, run `clusterduck stop`

For debugging purposes use `DEBUG` environmental variable:
`DEBUG=* clusterduck`


## Events
### Cluster events

Event               | Description
--------------------|------------------------------------------------------
`nodes`             | Set of nodes has changed
`nodes:active`      | Set of active nodes has changed

### Node events

Event               | Description
--------------------|------------------------------------------------------
`state`             | Node state has changed

## Transports

```yaml
transports:
````

### Raft

```yaml
  - type: raft
    address: tcp://127.0.0.1:9911
    secret: your-secret-passphrase
    bootstrap: [ tcp://127.0.0.1:9910 ]
```

Parameter           | Description
--------------------|------------------------------------------------------
`address`           | Address to listen
`secret`            | Encryption passphrase, same in all Clusterduck instances

### HTTP

```yaml
  - type: http
    listen: 8880
    no_slave: true
```
Parameter           | Description
--------------------|------------------------------------------------------
`listen`            | Port to listen
`no_slave`          |

## Dependencies

### Core

- [uuid](https://www.npmjs.com/package/uuid) — command-line argument parser
- [yargs](https://www.npmjs.com/package/yargs) — command-line argument parser
- [js-yaml](https://www.npmjs.com/package/js-yaml) — configuration files
- [yaml](https://www.npmjs.com/package/yaml) — configuration files
- [collections](https://www.npmjs.com/package/collections) — entity collections
- [daemonize-process](https://www.npmjs.com/package/daemonize-process)
- [diagnostics](https://www.npmjs.com/package/diagnostics)
- [md5](https://www.npmjs.com/package/md5)
- [sha3](https://www.npmjs.com/package/sha3)
- [shell-quote](https://www.npmjs.com/package/shell-quote)
- [parse-duration](https://www.npmjs.com/package/parse-duration)

### Raft
- [liferaft](https://www.npmjs.com/package/liferaft) — Raft protocol implementation
- [axon](https://www.npmjs.com/package/axon)
- [leveldown](https://www.npmjs.com/package/leveldown)

### WebSocket
- [websocket](https://www.npmjs.com/package/websocket)
- [weak](https://www.npmjs.com/package/weak)
- [shoe](https://www.npmjs.com/package/shoe)
- [express](https://www.npmjs.com/package/express)

### DNode transport
- [dnode](https://www.npmjs.com/package/dnode)
- [dnode-promise](https://www.npmjs.com/package/dnode-promise)


## License

LGPL 3.0 or later.

[Raft]: https://ramcloud.stanford.edu/raft.pdf

[Liferaft]: https://github.com/unshiftio/liferaft
