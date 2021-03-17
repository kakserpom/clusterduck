clusterduck-redis [![total downloads of clusterduck-redis](https://img.shields.io/npm/dt/clusterduck-redis.svg)](https://www.npmjs.com/package/clusterduck-redis)
=======
[![clusterduck-redis's License](https://img.shields.io/npm/l/clusterduck-redis.svg)](https://www.npmjs.com/package/clusterduck-redis)
[![latest version of clusterduck-redis](https://img.shields.io/npm/v/clusterduck-redis.svg)](https://www.npmjs.com/package/clusterduck-redis)


__A [Redis] extension for [Clusterduck] which includes:__

- Health checks
- Balancer running on [Envoy] with seamless [hot restarting].
- Native Redis balancer *(EXPERIMENTAL)*: [clusterduck-redis-native-lb]

## Table Of Contents

- [Installation](#installation)
- [Configuration](#configuration)
    - [Nodes](#nodes)
    - [Health checks](#health-checks)
    - [Envoy balancer](#envoy-balancer)
- [Dependencies](#dependencies)
- [License](#license)

## Installation

[Clusterduck] is required.

```
npm -g clusterduck-redis
```

## Configuration

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

### Envoy balancer

[Envoy] is required to be installed.

Let's write up a config:

```yaml
  balancers:

    my_balancer:
      type: envoy
      listen: 0.0.0.0:9999

      # This section is optional
      admin:
        access_log_path: "/tmp/admin_access.log"
        address:
          socket_address:
            address: "127.0.0.1"
            port_value: 9901
``` 

> *Note:* `clusterduck` will run  `envoy` with an according configuration.
> [Hot restarting] works out-of-box so the `envoy` is always kept in __sync__ with `clusterduck`. It requires no middleware or additional configuration.

## Debug

For debugging purposes use `DEBUG` environmental variable:
`DEBUG=ioredis*,envoy clusterduck`

## Cluster events

Event               | Description
--------------------|------------------------------------------------------
`nodes`             | Set of nodes has changed
`active`            | Set of active nodes has changed

## Node events

Event               | Description
--------------------|------------------------------------------------------
`state`             | Node state has changed

## Dependencies

- [clusterduck]
- [ioredis](https://www.npmjs.com/package/ioredis-conn-pool)

### Envoy balancer

- [tmp-promise](https://www.npmjs.com/package/tmp-promise)

## License

LGPL 3.0 or later.

[ioredis]: https://ramcloud.stanford.edu/raft.pdf

[Liferaft]: https://github.com/unshiftio/liferaft

[hot restarting]: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/hot_restart

[Envoy]: https://envoyproxy.io/

[Redis]: https://redis.io/

[Clusterduck]: (https://www.npmjs.com/package/clusterduck)