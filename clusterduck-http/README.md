clusterduck-http [![total downloads of clusterduck-http](https://img.shields.io/npm/dt/clusterduck-http.svg)](https://www.npmjs.com/package/clusterduck-http)
=======
[![clusterduck-http's License](https://img.shields.io/npm/l/clusterduck-http.svg)](https://www.npmjs.com/package/clusterduck-http)
[![latest version of clusterduck-http](https://img.shields.io/npm/v/clusterduck-http.svg)](https://www.npmjs.com/package/clusterduck-http)

__An [http] extension for [Clusterduck] which includes:__

- HTTP/WebSocket health checks
- Balancer: [HAProxy] integration with seamless [hot restarting].

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
npm i -g clusterduck-http
```

## Configuration

Let's define a HTTP cluster named `my_web_cluster`:

```yaml
# clusters:

my_http_cluster:
  type: clusterduck-http
```

### Nodes

Then let's define some nodes:

```yaml
    # List of nodes
    nodes:
      - addr: 1.1.1.1:80
      - addr: 2.2.2.2:80
```
 
*Note that you can omit this altogether if you want to only add nodes dynamically.*

### Health checks

```yaml
    pass_without_checks: true
```

### HAProxy balancer

[HAProxy] is required to be installed.

Let's write up a config:

```yaml
  balancers:

    my_balancer:
      type: haproxy
      listen: 0.0.0.0:443

``` 

> *Note:* `clusterduck` will run  `haproxy` with an according configuration.
> [Hot restarting] works out-of-box so that `HAProxy` is always kept in __sync__ with `clusterduck`.
> It requires no middleware or additional configuration.

## Debug

For debugging purposes use `DEBUG` environmental variable:
`DEBUG=haproxy clusterduck`

## Dependencies

- [clusterduck]

### HAProxy balancer

- [tmp-promise](https://www.npmjs.com/package/tmp-promise)

## License

LGPL 3.0 or later.

[hot restarting]: https://www.haproxy.com/blog/truly-seamless-reloads-with-haproxy-no-more-hacks/

[HAProxy]: https://haproxy.com/

[Clusterduck]: (https://www.npmjs.com/package/clusterduck)