import React from 'react';
import clusterduck from '../../clusterduck'
import {Breadcrumb, BreadcrumbItem, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import CD_Component from "../../CD_Component";
import classnames from "classnames";
import {withRouter} from 'react-router-dom';
import {Table, Button} from 'antd';
import {Header} from "../../vibe/index";
import {PageContent} from "../../vibe";
import JsonBox from "../../components/json-box";
import * as timeago from 'timeago.js';
import * as ReactDOM from "react-dom";
import * as Feather from "react-feather";
import {css} from "@emotion/css";
import CodeBox from "../../components/code-box";

const fixPagination = table => {
    Array.from(ReactDOM.findDOMNode(table).getElementsByClassName('ant-table-pagination'))
        .forEach(el => {
            console.log('test')
            el.classList.remove('ant-table-pagination-right')
            el.classList.add('ant-table-pagination-left')
        })
}


class Cluster extends CD_Component {
    constructor(props) {
        super(props)
        this.tab = this.props.match.params.tab || 'nodes'
        this.section = this.props.match.params.section || ''
    }

    componentDidMount() {
        clusterduck.clusterOnce(this.props.match.params.cluster, cluster => this.setState({cluster: cluster}))
    }

    render() {
        const cluster = this.state && this.state.cluster

        const that = this
        if (!cluster) {
            return <div></div>
        }


        const renderNumber = number => number === '~' ? number : Intl.NumberFormat().format(number)
        const renderList = list => {
            list = list || []
            if (!list.length) {
                return <i>None</i>
            }
            return <ul>{list.map((item, i) => <li key={i}>{item}</li>)}</ul>
        }

        const ActionButton = ({children, onClick, action, node, args, ...props}) => {
            return (
                <Button style={{marginRight: "10px"}} onClick={() =>
                    clusterduck.command(action, cluster.name, node.addr, ...(args || []))} {...props}>
                    {children}
                </Button>
            )
        }
        const TabHeader = withRouter(({history, children, name, section}) => {
            return (
                <NavItem>
                    <NavLink
                        href={'/clusters/' + encodeURIComponent(cluster.name) + '/' + encodeURIComponent(name) + (section ? '/' + encodeURIComponent(section) : '')}
                        className={classnames({active: this.tab === name})}
                        onClick={function (e) {
                            e.preventDefault()
                            history.push(this.href)
                            that.tab = name
                            that.render()
                        }}
                        aria-current="page"
                    >
                        {children}
                    </NavLink>
                </NavItem>
            )
        })

        const expandedRowRender = node => {
            return <span>
                <p>{node.comment ? <span>{node.comment}</span> : <i>Comment is empty</i>}</p>
                 <JsonBox value={node.attrs || {}}/>
            </span>;
        }
        const pagination = {position: 'both'};

        class NodesTable extends React.Component {

            state = {
                bordered: true,
                loading: false,
                pagination,
                size: 'default',
                expandedRowRender,
                // rowSelection: {},
                scroll: undefined,
                tableLayout: undefined,
            };

            constructor(props) {
                super(props);
                this.handler = cluster => {
                    this.fetch(cluster.nodes ?
                        cluster.nodes.map(node => ({
                            key: node.addr,
                            error: '',
                            ...node,
                        }))
                        : null
                    )
                }
            }

            componentDidMount() {
                setTimeout(() => fixPagination(this), 100)
                clusterduck.cluster(that.state.cluster.name, this.handler)
            }

            componentWillUnmount() {
                clusterduck.off('cluster:' + that.state.cluster.name, this.handler)
            }

            handleChange = (pagination, filters, sorter) => {
                this.setState({
                    pagination: pagination,
                    filteredInfo: filters,
                    sortedInfo: sorter,
                });
            }

            fetch(data) {
                this.setState({
                    dataSource: data,
                })
            }

            render() {
                const {state} = this;
                let {sortedInfo} = state;
                sortedInfo = sortedInfo || {};

                //let {filteredInfo} = state;
                //filteredInfo = filteredInfo || {};

                const columns = [
                    {
                        title: 'Address',
                        dataIndex: 'addr',
                        key: 'addr',
                        width: '10%',
                        render: text => <a href={"#!"}>{text}</a>,
                        sorter: (a, b) => a.addr.localeCompare(b.addr),
                        sortOrder: sortedInfo.columnKey === 'addr' && sortedInfo.order,
                    },
                    {
                        title: 'Active',
                        width: '5%',
                        dataIndex: 'active',
                        key: 'active',
                        render: (active, node) => {
                            if (active) {
                                return <span aria-label="Active" role={"img"}>🟢</span>
                            } else if (node.spare) {
                                return <span aria-label="Spare" role={"img"}>🟡</span>
                            } else {
                                return <span aria-label="Not active" role={"img"}>🔴</span>
                            }
                        },
                        sorter: (a, b) => (a.active ? 1 : 0) - (b.active ? 1 : 0),
                        sortOrder: sortedInfo.columnKey === 'active' && sortedInfo.order,
                    },
                    {
                        title: 'Available',
                        dataIndex: 'available',
                        width: '5%',
                        key: 'available',
                        render: (available, node) => {
                            if (available) {
                                return <span aria-label="Available" role={"img"}>✅</span>
                            } else {
                                return <span aria-label="Not available" role={"img"}>❌</span>
                            }
                        },
                        sorter: (a, b) => (a.available ? 1 : 0) - (b.available ? 1 : 0),
                        sortOrder: sortedInfo.columnKey === 'available' && sortedInfo.order,
                    },
                    {
                        title: 'Spare',
                        dataIndex: 'spare',
                        width: '5%',
                        key: 'spare',
                        render: spare => spare ? 'YES' : 'NO',
                        sorter: (a, b) => (a.spare ? 1 : 0) - (b.spare ? 1 : 0),
                        sortOrder: sortedInfo.columnKey === 'spare' && sortedInfo.order,
                    },
                    {
                        title: 'Disabled',
                        dataIndex: 'disabled',
                        width: '5%',
                        key: 'disabled',
                        render: disabled => disabled ? 'YES' : 'NO',
                        sorter: (a, b) => (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0),
                        sortOrder: sortedInfo.columnKey === 'disabled' && sortedInfo.order,
                    },
                    {
                        title: 'Errors',
                        width: '10%',
                        dataIndex: 'errors',
                        key: 'errors',
                        render: renderList,
                        sorter: (a, b) => a.errors.length - b.errors.length,
                        sortOrder: sortedInfo.columnKey === 'errors' && sortedInfo.order,
                    },
                    {
                        title: 'Warnings',
                        width: '10%',
                        dataIndex: 'warnings',
                        key: 'warnings',
                        render: renderList,
                        sorter: (a, b) => a.warnings - b.warnings,
                        sortOrder: sortedInfo.columnKey === 'warnings' && sortedInfo.order,
                    },
                    {
                        title: 'Action',
                        key: 'action',
                        render: (text, node) => (
                            <span>
                        {node.disabled ? <ActionButton action={"updateNode"} node={node}
                                                       args={[{disabled: false}]}>Enable</ActionButton> :
                            <ActionButton action={"updateNode"} node={node}
                                          args={[{disabled: true}]}>Disable</ActionButton>}
                                <ActionButton action={"deleteNode"} node={node}>Delete</ActionButton>
                    </span>),
                    },
                ];
                return <Table
                    {...this.state}
                    columns={columns.map(item => ({...item}))}
                    dataSource={this.state.dataSource}
                    onChange={this.handleChange}
                />;
            }
        }

        /**
         *
         * @type {{envoy: (function({balancer: *}))}}
         */
        const Balancers = {
            nginx: ({balancer}) => {
                class Config extends React.Component {

                    constructor(props) {
                        super(props);
                        this.state = {config: props.config}
                        this.handler = cluster => {
                            console.log('handler: ', {config: cluster.balancers[balancer.name].lastConfig})
                            this.setState({config: cluster.balancers[balancer.name].lastConfig})
                        }
                    }

                    componentDidMount() {
                        clusterduck.cluster(that.state.cluster.name, this.handler)
                    }

                    componentWillUnmount() {
                        clusterduck.off('cluster:' + that.state.cluster.name, this.handler)
                    }

                    render() {
                        return <CodeBox value={this.state.config}/>
                    }

                }

                return <div>
                    <p><i>Current configuration:</i></p>
                    <Config config={balancer.lastConfig || {}}/>
                </div>
            },
            envoy: ({balancer}) => {

                const pRef = React.createRef()

                class QueryStats extends React.Component {

                    state = {
                        bordered: true,
                        loading: true,
                        pagination,
                        size: 'default',
                        scroll: undefined,
                        tableLayout: undefined,
                    };

                    componentDidMount() {

                        setTimeout(() => fixPagination(this), 100)

                        let previous = []
                        let generation
                        const fetch = () => {
                            clusterduck.command('balancerFetchInfo', cluster, balancer, 'stats', info => {

                                if (!info || !info.server || !info.redis) {
                                    return
                                }

                                if (pRef.current) {
                                    ReactDOM.render
                                    (<i>Statistics are shown since the last Envoy restart.
                                        Envoy has
                                        started {timeago.format(Date.now() - info.server.uptime * 1e3)}.
                                    </i>, pRef.current)
                                }

                                const stat = info.redis.egress_redis

                                if (generation !== info.hot_restart_generation) {
                                    generation = info.hot_restart_generation
                                    previous = []
                                }

                                previous.push(stat)
                                if (previous.length > 3) {
                                    previous.shift()
                                }

                                const all = {
                                    command: 'ALL COMMANDS',
                                    total: 0,
                                    success: 0,
                                    error: 0,
                                    rps: 0,
                                    key: 'ALL COMMANDS',
                                }
                                if (!stat.command) {
                                    return
                                }
                                if (this.state.loading) {
                                    this.setState({loading: false})
                                }
                                this.fetch(stat ?
                                    Object.entries(stat.command)
                                        .filter(([name, command]) => {
                                            return command.total > 0
                                        }).map(([name, command]) => {
                                        all.total += command.total
                                        all.success += command.success
                                        all.error += command.error

                                        let rps

                                        if (previous.length > 1) {
                                            rps = (command.total - previous[0].command[name].total) / (previous.length - 1)
                                            all.rps += rps
                                        } else {
                                            rps = '~'
                                        }

                                        return {
                                            key: name,
                                            command: name,
                                            rps,
                                            ...command,
                                        }
                                    }).concat(all)
                                    : null
                                )
                            })
                            setTimeout(() => fetch(), 1e3)
                        }
                        fetch()
                    }

                    handleChange = (pagination, filters, sorter) => {
                        this.setState({
                            pagination: pagination,
                            filteredInfo: filters,
                            sortedInfo: sorter,
                        });
                    }

                    fetch(data) {
                        this.setState({
                            dataSource: data,
                        })
                    }

                    render() {
                        const {state} = this;
                        let {sortedInfo} = state;
                        sortedInfo = sortedInfo || {};

                        //let {filteredInfo} = state;
                        //filteredInfo = filteredInfo || {};

                        const columns = [
                            {
                                title: 'Command',
                                dataIndex: 'command',
                                key: 'command',
                                width: '10%',
                                sorter: (a, b) => a.command.localeCompare(b.command),
                                sortOrder: sortedInfo.columnKey === 'command' && sortedInfo.order,
                            },
                            {
                                title: 'Total',
                                width: '5%',
                                dataIndex: 'total',
                                key: 'total',
                                render: renderNumber,
                                sorter: (a, b) => a.total - b.total,
                                sortOrder: sortedInfo.columnKey === 'total' && sortedInfo.order,
                            },
                            {
                                title: 'Success',
                                width: '5%',
                                dataIndex: 'success',
                                key: 'success',
                                render: renderNumber,
                                sorter: (a, b) => a.success - b.success,
                                sortOrder: sortedInfo.columnKey === 'success' && sortedInfo.order,
                            },
                            {
                                title: 'Error',
                                width: '5%',
                                dataIndex: 'error',
                                key: 'total',
                                render: renderNumber,
                                sorter: (a, b) => a.error - b.error,
                                sortOrder: sortedInfo.columnKey === 'error' && sortedInfo.order,
                            },
                            {
                                title: 'Per second',
                                width: '5%',
                                dataIndex: 'rps',
                                key: 'rps',
                                render: renderNumber,
                                sorter: (a, b) => a.rps - b.rps,
                                sortOrder: sortedInfo.columnKey === 'rps' && sortedInfo.order,
                            },

                            {
                                title: 'Latency',
                                width: '40%',
                                dataIndex: 'latency',
                                key: 'latency',
                                sorter: (a, b) => a.command.localeCompare(b.command),
                                sortOrder: sortedInfo.columnKey === 'latency' && sortedInfo.order,
                            },
                            {
                                title: '',
                                render: (text, node) => (
                                    <span/>
                                ),
                            },
                        ];
                        return <span>
                            <p ref={pRef}></p>
                        <Table
                            {...this.state}
                            columns={columns.map(item => ({...item}))}
                            dataSource={this.state.dataSource}
                            onChange={this.handleChange}
                        /></span>;
                    }
                }

                return <div>
                    <QueryStats/>
                    <p><i>Current configuration:</i></p>
                    <JsonBox value={balancer.lastConfig || null}/>
                </div>
            }
        }

        return (<div>
                <Header {...this.props}>
                    <Breadcrumb>
                        <BreadcrumbItem><Feather.Layers style={{width: 20, height: 20}}/> <a
                            href={"#!"}>Clusters</a></BreadcrumbItem>
                        <BreadcrumbItem active={true}>
                            <img
                                src={cluster.software.logo}
                                style={{width: 20, height: 20}}
                                alt={cluster.software.name}
                                aria-hidden={true}
                            />&nbsp;{cluster.name}</BreadcrumbItem>
                    </Breadcrumb>
                </Header>
                <PageContent>
                    <div className="page-sub-nav">
                        <Nav pills>
                            <TabHeader name={"nodes"}>Nodes</TabHeader>
                            <TabHeader name={"balancers"}>Balancers</TabHeader>
                        </Nav>
                    </div>
                    <div>
                        {this.tab === 'nodes' ? <NodesTable/> : ''}
                        {this.tab === 'balancers' ? <div>
                                <Nav tabs>
                                    {Object.keys(cluster.balancers || {}).map(name => {
                                        const balancer = cluster.balancers[name]
                                        return <TabHeader name={"balancers"} section={name}
                                                          key={'balancers/' + balancer}>
                                            <img src={balancer.software.logo}
                                                 style={{width: 80, height: 80}}
                                                 alt={balancer.software.name}
                                                 aria-hidden={true}
                                            /> {name}</TabHeader>
                                    })}
                                </Nav>
                                <TabContent activeTab={this.section || Object.keys(cluster.balancers || {})[0] || ''}>
                                    {Object.keys(cluster.balancers || {}).map(name => {
                                        const balancer = cluster.balancers[name]
                                        balancer.name = name // @todo remove
                                        const type = balancer.config.type
                                        const Balancer = Balancers[type] || null
                                        return <TabPane tabId={name} key={name}>
                                            {Balancer ? <Balancer balancer={balancer}/> :
                                                <i>Balancer "{type}" is not supported by the Dashboard.</i>}
                                        </TabPane>
                                    })}
                                </TabContent>
                            </div>
                            : ''}
                    </div>
                </PageContent>
            </div>
        )
    }

}

export default Cluster;
