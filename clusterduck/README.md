<img src="https://raw.githubusercontent.com/kakserpom/clusterduck/master/clusterduck-dashboard/src/assets/images/logo.svg" width=180 style="float:left; margin-right: 60px" />

clusterduck
=======
[![total downloads of clusterduck](https://img.shields.io/npm/dt/clusterduck.svg)](https://www.npmjs.com/package/clusterduck)
[![clusterduck's License](https://img.shields.io/npm/l/clusterduck.svg)](https://www.npmjs.com/package/clusterduck)
[![latest version of clusterduck](https://img.shields.io/npm/v/clusterduck.svg)](https://www.npmjs.com/package/clusterduck)

*A better way to supervise your clusters and services.*
<br /><br />
*The project is recently hatched and in the stage of active development.*

**Clusterduck** is a robust solution for real-time distributed monitoring and self-healing clustering.

- **[Raft] consensus algorithm. Ducks love them rafts 😉**

  [liferaft] is running over a robust TLS transport with and **peer discovery** and **HMAC-based authentication**. 


- **Health checks, real-time and voting-based.**


- **Events and triggers**


- __Easy to use and extend.__
  Given its modular architecture you can hack up your own plugin in under an hour.

### Featured extensions

🚀 [clusterduck-dashboard](https://www.npmjs.com/package/clusterduck-redis) — A full-fledged dashboard built with **React** and
**Websocket**.

 <img src="https://cdn.cdnlogo.com/logos/r/3/redis.svg" width=20 style="display:inline"></img> [clusterduck-redis](https://www.npmjs.com/package/clusterduck-redis) — Redis health checks and **envoy**-based
  balancing

🚀 [clusterduck-http](https://www.npmjs.com/package/clusterduck-http) — HTTP/Websocket health checks and **haproxy/nginx** support.


## Table Of Contents

- [Installation](#installation)
- [Command-line interface](#command-line)
- [Configuration](#configuration)
- [Events](#events)
    - [Node events](#node-events)
    - [Cluster events](#cluster-events)
- [Transports](#transports)
- [Dependencies](#dependencies)
- [License](#license)

## Installation

*Node 15.x is recommended.*

```bash
npm i -g clusterduck
```

Alternatively, you can clone the repo and link the dependencies which is useful for development purposes:

```bash
git clone git@github.com:kakserpom/clusterduck.git
cd clusterduck
node link
```

### TLS

If you want to enable TLS for Raft, run this to generate certificates:

`clusterduck gen-tls`

## Command-line interface

Run the  `clusterduck` command to see if it all works for you.

If you want to daemonize it, run `clusterduck -d`

If you want to stop a running daemon, run `clusterduck stop`

For debugging purposes use `DEBUG` environmental variable:
`DEBUG=* clusterduck`

## Configuration

The default config file path is `/etc/clusterduck/clusterduck.yaml`

### Clusters

Let's define a Redis cluster named `my_redis_cluster`:

```yaml
# clusters:

my_redis_cluster:
  type: clusterduck-redis
```

### Nodes

Then let's define some nodes:

```yaml
    # List of nodes
    nodes:
      - addr: 127.0.0.1:6379
      - addr: 127.0.0.1:6380
```

*Note that you can omit this altogether if you want to only add nodes dynamically.*

### Health checks

Now let's set up a simple __health check__.

```yaml
    health_checks:
      - type: basic
        timeout: 1s
        every: 1s
        commands:
          - [ 'SET', 'x', 'y' ]
```

*Now every second each node in the cluster will get checked on.*

### Triggers

Now let's live export the list of active nodes:

```yaml
    triggers:
      - on: [ active ]
        do:
          - type: shell
            cwd: /tmp
            commands:
              - "echo $nodes_active_addrs > active_nodes.json"
```

*This will make sure that `/tmp/nodes_list` always contains a current list of alive nodes*.

## Events

### Cluster events

Event               | Description
--------------------|------------------------------------------------------
`changed`             | Set of nodes has changed

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
    address: tls://127.0.0.1:9911
    bootstrap: [ tls://127.0.0.1:9910 ]
```

Parameter           | Description
--------------------|------------------------------------------------------
`address` *         | Address to listen
`tls`               | Path pattern to key/cert files. Default is `clusterduck.%s` (relative to the config file directory)
`bootstrap`         | List of node addresses to connect with.

> Clusterduck instances will exchange peers and update `bootstrap` accordingly, but initial address is necessary.

### HTTP

```yaml
  - type: http
    listen: 8880
```

Parameter           | Description
--------------------|------------------------------------------------------
`listen`            | Port to listen

## Roadmap

- CLI
- Live config updates (i.e. more Commands)
- Web-interface with websocket
- REST API

## Dependencies

### Raft

- [liferaft](https://www.npmjs.com/package/liferaft) — Raft protocol implementation (kudos to 3d-Eden and @bergos)
- [axon-tls](https://www.npmjs.com/package/axon-tls) — Transport library
- [leveldown](https://www.npmjs.com/package/leveldown) — DB for log persistence

### Misc

- [uuid](https://www.npmjs.com/package/uuid) — uuid generation
- [yargs](https://www.npmjs.com/package/yargs) — command-line argument parser
- [js-yaml](https://www.npmjs.com/package/js-yaml), [yaml](https://www.npmjs.com/package/yaml)  — configuration files
- [daemonize-process](https://www.npmjs.com/package/daemonize-process)
- [diagnostics](https://www.npmjs.com/package/diagnostics) - debug output
- [md5](https://www.npmjs.com/package/md5), [sha3](https://www.npmjs.com/package/sha3)
- [shell-quote](https://www.npmjs.com/package/shell-quote)
  , [parse-duration](https://www.npmjs.com/package/parse-duration)

### Transports

- [express](https://www.npmjs.com/package/express)
- [jayson](https://www.npmjs.com/package/jayson), [jayson-promise](https://www.npmjs.com/package/jayson-promise)

## License

LGPL 3.0 or later.

[Raft]: https://ramcloud.stanford.edu/raft.pdf

[Liferaft]: https://github.com/unshiftio/liferaft
