import React from 'react';
import clusterduck from '../../clusterduck'
import {Row, Col, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import CD_Component from "../../CD_Component";
import classnames from "classnames";
import {withRouter} from 'react-router-dom';
import {Table, Button} from 'antd';
import {Header} from "../../vibe/index";
import {Page, PageContent} from "../../vibe";
import * as Feather from 'react-feather';

class Cluster extends CD_Component {
    constructor(props) {
        super(props)
        this.tab = this.props.match.params.tab || 'nodes'
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
        const TabHeader = withRouter(({history, children, name}) => {
            return (
                <NavItem>
                    <NavLink
                        href={'/clusters/' + cluster.name + '/' + name}
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
        const showHeader = true;
        const scroll = {y: 240};
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
                let {filteredInfo} = state;
                sortedInfo = sortedInfo || {};
                filteredInfo = filteredInfo || {};

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
                        render: available => available ? '✅' : '❌'
                    },
                    {
                        title: 'Spare',
                        dataIndex: 'spare',
                        width: '5%',
                        key: 'spare',
                        render: spare => spare ? 'YES' : 'NO'
                    },
                    {
                        title: 'Disabled',
                        dataIndex: 'disabled',
                        width: '5%',
                        key: 'disabled',
                        render: disabled => disabled ? 'YES' : 'NO'
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

        return (<div>
                <Header {...this.props}>
                    Clusters&nbsp;&nbsp;❯&nbsp;&nbsp;
                    <img
                        src={cluster.software.logo}
                        style={{width: 30, height: 30}}
                        alt={cluster.software.name}
                        aria-hidden={true}
                    /> {cluster.name}
                </Header>
                <PageContent>
                    <div>
                        <div>
                            <Nav tabs>
                                <TabHeader name={"nodes"}>Nodes</TabHeader>
                            </Nav>
                            <TabContent activeTab={this.tab}>
                                <TabPane tabId="nodes">

                                    <NodesTable/>

                                </TabPane>
                            </TabContent>
                        </div>

                    </div>
                </PageContent>
            </div>
        )
    }

}

export default Cluster;
