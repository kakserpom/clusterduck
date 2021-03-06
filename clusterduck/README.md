<img src="https://raw.githubusercontent.com/kakserpom/clusterduck/master/clusterduck-dashboard/public/clusterduck.png" width=220 align=left />

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
  [liferaft] is running over a robust TLS transport with **peer discovery** and **HMAC-based authentication**.


- **Health checks, real-time and voting-based.**


- **Self-healing clusters.** When the number of active nodes in a cluster falls below a given threshold, new nodes will
  be started automatically on the least loaded server(s) in a split second.
  **Spare pools are supported.**


- **Events and triggers**
  Just about everything is an event that you can hook up your trigger to.


- **KISS.**
  Hacking up your own plugin is definitely not a rocket science.

### Featured extensions

🚀 [clusterduck-dashboard](https://www.npmjs.com/package/clusterduck-dashboard) — A full-fledged dashboard built with **React** and
**Websocket**.

<img src="https://cdn.cdnlogo.com/logos/r/3/redis.svg" width=20 style="display:inline"></img> [clusterduck-redis](https://www.npmjs.com/package/clusterduck-redis)
— Redis health checks and **envoy**-based balancing

🚀 [clusterduck-http](https://www.npmjs.com/package/clusterduck-http) — HTTP/Websocket health checks and **haproxy/nginx**
support.

## Table Of Contents

- [Installation](#installation)
- [Command-line interface](#command-line)
- [Configuration](#configuration)
- [Events](#events)
    - [Node events](#node-events)
    - [Cluster events](#cluster-events)
- [Transports](#transports)

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
clusters:
  
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
        interval: 10s
        interval_after_fail: 1s
        commands:
          - [ 'SET', 'x', 'y' ]
```

*Now every 10 secs each node in the cluster will get checked on. If the check fails, a retry happens after 1 sec.*

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
- REST API

### Transports

- [express](https://www.npmjs.com/package/express)
- [jayson](https://www.npmjs.com/package/jayson), [jayson-promise](https://www.npmjs.com/package/jayson-promise)

[Raft]: https://ramcloud.stanford.edu/raft.pdf

[Liferaft]: https://github.com/unshiftio/liferaft
