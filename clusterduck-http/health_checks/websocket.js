module.exports = (node, config, timeoutMs) =>
    new Promise((resolve, reject) => {
        try {
            const WebSocket = require('ws')
            const parseAddr = require('clusterduck/misc/addr')
            const evilDns = require('evil-dns')
            const url = new URL(config.url)
            const addr = parseAddr(node.addr)
            const run = () => {

                if (evilDns.domains.filter(item => item.source === url.host).length) {
                    setTimeout(run, 30)
                    return
                }

                const warnings = []

                evilDns.add(url.host, addr.hostname)

                const client = new WebSocket(config.url)

                const destroy = () => {
                    client.close()
                }

                try {
                    client.on('error', error => {
                        console.log(error)
                        evilDns.remove(url.host)

                        reject(error)
                    })
                    const dotProp = require('clusterduck/misc/dot-prop')

                    setTimeout(() => {
                        reject(new Error('timeout'))
                        destroy()
                    }, timeoutMs)

                    client.on('open', () => {
                        evilDns.remove(url.host)

                        const flow = config.flow || []
                        let i = 0
                        let finished = false
                        const flowControl = message => {
                            if (finished) {
                                return
                            }
                            while (i < flow.length) {
                                const item = flow[i]
                                if (item.type === 'send_json') {
                                    client.send(JSON.stringify(item.body))
                                } else if (item.type === 'send') {
                                    client.send(item.body)
                                } else if (item.type === 'expect_json') {
                                    try {
                                        const parsed = JSON.parse(message)
                                        if (item.match) {
                                            item.match.forEach(test => {
                                                const propName = test[0]
                                                const op = test[1] || 'exists'
                                                const right = test[2]
                                                const prop = dotProp.get(parsed, propName)

                                                if (op === 'exists') {
                                                    if (prop === undefined) {
                                                        throw new Error('Prop ' + JSON.stringify(propName) + ' is undefined')
                                                    }
                                                }
                                            })
                                        }
                                    } catch (error) {
                                        if (item.skip_forward) {
                                            return
                                        } else {
                                            reject(error)
                                            destroy()
                                            return
                                        }
                                    }
                                }
                                ++i
                            }
                            resolve({warnings})
                            destroy()
                            finished = true
                        }

                        flowControl()
                        client.on('message', flowControl)
                    })


                } catch (error) {
                    reject(error)
                    destroy()
                }
            }

            run()
        } catch (error) {
            reject(error)
        }
    })
