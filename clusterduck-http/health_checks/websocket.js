return module.exports = (node, config, timeoutMs) =>
    new Promise((resolve, reject) => {

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

            evilDns.add(url.host, addr.hostname)

            const client = new WebSocket(config.url)

            const destroy = () => {
                client.close()
            }

            try {
                client.on('error', error => {
                    console.log(error)
                    evilDns.remove(url.host)

                    reject(error.message)
                })
                const dotProp = require('dot-prop')
                client.on('open', () => {
                    evilDns.remove(url.host)
                    setTimeout(() => {
                        reject('timeout')
                        destroy()
                    }, timeoutMs)


                    const flow = config.flow || []
                    let i = 0
                    const flowControl = message => {
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
                                        reject(error.message)
                                        destroy()
                                        return
                                    }
                                }
                            }
                            ++i
                        }
                        resolve()
                        destroy()
                    }

                    flowControl()

                    client.on('message', message => {
                        flowControl(message)
                    })
                })


            } catch (error) {
                reject(error.message)
                destroy()
            }
        }

        run()
    })
