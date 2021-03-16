# clusterduck-redis-native-lb

`clusterduck-redis-native-lb` is an *EXPERIMENTAL* sub-extension for [clusterduck-redis] [Clusterduck] that implements
a Redis balancer written in Javascript.

## Dependencies

- [clusterduck](https://www.npmjs.com/package/clusterduck)
- [clusterduck-redis](https://www.npmjs.com/package/clusterduck-redis)
- [ioredis-conn-pool](https://www.npmjs.com/package/ioredis-conn-pool)
- [hashring](https://www.npmjs.com/package/hashring)
- [redis-parser](https://www.npmjs.com/package/hashring)
- [shell-quote](https://www.npmjs.com/package/hashring)

## License

LGPL 3.0 or later.

[ioredis]: https://ramcloud.stanford.edu/raft.pdf

[Liferaft]: https://github.com/unshiftio/liferaft

[hot restarting]: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/hot_restart

[Envoy]: https://envoyproxy.io/

[Redis]: https://redis.io/

[Clusterduck]: (https://www.npmjs.com/package/clusterduck)