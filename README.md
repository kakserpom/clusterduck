# clusterduck

`clusterduck` is a take on consensus-based cluster monitoring implemented in Javascript. Whenever

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
- [Usage](#usage)
    - [Configuration](#configuration)
    - [Command-line](#command-line)
    - [Cluster events](#cluster-events)
    - [Node events](#node-events)
- [Transports](#transports)
- [Extending](#extending)
- [License](#license)

## Usage

Once you have done with installation, you need to write a config.

### Configuration

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

### Command-line

Run the  `clusterduck` command to see if it all works for you.

If you want to daemonize it, run `clusterduck -d`

If you want to stop a running daemon, run `clusterduck stop`

For debugging purposes use `DEBUG` environmental variable:
`DEBUG=* clusterduck`



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

## Extending

...

## License

LGPL 3.0 or later.

[Raft]: https://ramcloud.stanford.edu/raft.pdf

[Liferaft]: https://github.com/unshiftio/liferaft
