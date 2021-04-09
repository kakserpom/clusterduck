clusterduck-dashboard
=======
[![total downloads of clusterduck-dashboard](https://img.shields.io/npm/dt/clusterduck-dashboard.svg)](https://www.npmjs.com/package/clusterduck-dashboard)
[![clusterduck-dashboard's License](https://img.shields.io/npm/l/clusterduck-dashboard.svg)](https://www.npmjs.com/package/clusterduck-dashboard)
[![latest version of clusterduck-dashboard](https://img.shields.io/npm/v/clusterduck-dashboard.svg)](https://www.npmjs.com/package/clusterduck-dashboard)

__A dashboard addon for [Clusterduck] which includes:__

- Live logs
- Cluster managemeent

## This is just a developement preview!

## Table Of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [License](#license)

## Installation

[Clusterduck] is required.

```
npm i -g clusterduck-dashboard
```

## Configuration


```yaml
transports:
  - type: http
    listen: [ 8880, 0.0.0.0 ]
    auth:
      username: admin
      password: admin
    addons: [ clusterduck-dashboard ]
```

## License

LGPL 3.0 or later.

[Clusterduck]: (https://www.npmjs.com/package/clusterduck)