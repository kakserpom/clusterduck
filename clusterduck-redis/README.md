# clusterduck-redis

`clusterduck-redis` is the Redis extension for `clusterduck`

## Installation
```
npm -g clusterduck-redis
```

## Table Of Contents

- [Installation](#installation)
- [Usage](#usage)
    - [Configuration](#configuration)
    - [Command-line](#command-line)
    - [Cluster events](#cluster-events)
    - [Node events](#node-events)
- [Transports](#transports)
- [Dependencies](#dependencies)
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

### Debug
For debugging purposes use `DEBUG` environmental variable:
`DEBUG=ioredis clusterduck`


### Cluster events

Event               | Description
--------------------|------------------------------------------------------
`nodes`             | Set of nodes has changed
`nodes:active`      | Set of active nodes has changed

### Node events

Event               | Description
--------------------|------------------------------------------------------
`state`             | Node state has changed


## Dependencies

- [ioredis](https://www.npmjs.com/package/ioredis-conn-pool)

### Native balancer
- [ioredis-conn-pool](https://www.npmjs.com/package/ioredis-conn-pool)
- [hashring](https://www.npmjs.com/package/hashring)
- [redis-parser](https://www.npmjs.com/package/hashring)
- [redis-protocol](https://www.npmjs.com/package/hashring)
- [shell-quote](https://www.npmjs.com/package/hashring)

### Envoy balancer
- [tmp-promise](https://www.npmjs.com/package/tmp-promise)


## License

LGPL 3.0 or later.

[ioredis]: https://ramcloud.stanford.edu/raft.pdf

[Liferaft]: https://github.com/unshiftio/liferaft
