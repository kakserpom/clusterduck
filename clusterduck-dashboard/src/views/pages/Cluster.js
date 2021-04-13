import React, {useEffect, useState} from 'react';
import clusterduck from '../../clusterduck'
import {Breadcrumb, BreadcrumbItem, CardBody, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import CD_Component from "../../CD_Component";
import classnames from "classnames";
import {withRouter} from 'react-router-dom';
import {Table, Button} from 'antd';
import {Header} from "../../vibe/index";
import {PageContent} from "../../vibe";
import JsonBox from "../../components/json-box";

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

        const expandedRowRender = node => node.comment ? <p>{node.comment}</p> : <p><i>Comment is empty</i></p>;
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

            componentDidMount() {
                clusterduck.cluster(that.state.cluster.name, cluster => {
                    this.fetch(cluster.nodes ?
                        cluster.nodes.map(node => ({
                            key: node.addr,
                            ...node,
                        }))
                        : null
                    )
                })
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
                        render: (active, node) => active ? '🟢' : (node.spare ? '🟡' : '🔴'),
                        sorter: (a, b) => (a.active ? 1 : 0) - (b.active ? 1 : 0),
                        sortOrder: sortedInfo.columnKey === 'active' && sortedInfo.order,
                    },
                    {
                        title: 'Available',
                        dataIndex: 'available',
                        width: '5%',
                        key: 'available',
                        render: available => available ? '✅' : '❌',
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
            envoy: ({balancer}) => {

                const Stats = ({cluster, balancer}) => {
                    const [state, setState] = useState({})
                    useEffect(() => {
                        let previous = []
                        const fetch = () => {
                            clusterduck.command('balancerFetchInfo', cluster, balancer, 'stats', info => {
                                const stat = info.redis.egress_redis
                                previous.push(stat)
                                setState(stat)
                            })
                        }
                        setTimeout(() => {
                            fetch()
                        }, 0.5e3)

                        //   const interval = setTimeout(fetch, 1e3)
                        //    return () => clearInterval(interval)
                    })

                    return <JsonBox value={state}/>
                }

                return <div>
                    <Stats cluster={cluster.name} balancer={balancer.name}/>
                    <JsonBox value={balancer.lastConfig || null}/>
                </div>
            }
        }

        return (<div>
                <Header {...this.props}>
                    <Breadcrumb>
                        <BreadcrumbItem><a href={"#!"}>Clusters</a></BreadcrumbItem>
                        <BreadcrumbItem active={true}>{cluster.name}</BreadcrumbItem>
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
                                                <i>Balancer "{type}" is not supported.</i>}
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
