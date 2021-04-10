import React from 'react';
import clusterduck from '../../clusterduck.js'
import {Row, Col, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import CD_Component from "../../CD_Component";
import classnames from "classnames";
import {withRouter} from 'react-router-dom';
import {Table, Button} from 'antd';
import raftIcon from '../../assets/images/raft.svg'
import {Header, PageContent} from "../../vibe";

class Raft extends CD_Component {
    constructor(props) {
        super(props)
        this.tab = this.props.match.params.tab || 'nodes'
    }

    componentDidMount() {
        this.setState({})
    }

    render() {
        const that = this

        const ActionButton = ({children, onClick, action, node, args, ...props}) => {
            return (
                <Button style={{marginRight: "10px"}} onClick={() => {
                    if (action === 'switch') {
                        window.location.href = node.http.url + '/raft'
                    }
                }} {...props}>
                    {children}
                </Button>
            )
        }
        const TabHeader = withRouter(({history, children, name}) => {
            return (
                <NavItem>
                    <NavLink
                        href={'/raft/' + name}
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

        class NodesTable extends React.Component {

            state = {
                bordered: true,
                loading: false,
                pagination: {position: 'both'},
                size: 'default',
                expandedRowRender: node => <p>{JSON.stringify(node.options)}</p>,
                //   rowSelection: {},
                scroll: undefined,
                tableLayout: undefined,
            };

            componentDidMount() {
                clusterduck.raft(raft => {
                    this.fetch(raft.peers ?
                        raft.peers.map(peer => ({
                            key: peer.address,
                            http: peer.options.http || false,
                            ...peer,
                        }))
                        : null
                    )
                })
            }

            handleChange = (pagination, filters, sorter) => {
                console.log('Various parameters', pagination, filters, sorter);
                this.setState({
                    pagination: pagination,
                    filteredInfo: filters,
                    sortedInfo: sorter,
                });
                //  this.fetch()
            }

            fetch(data) {
                this.setState({
                    dataSource: data,
                })
            }

            handlePaginationChange = e => {
                const {value} = e.target;
                this.setState({
                    pagination: value === 'none' ? false : {position: value},
                });
            };

            render() {
                const {state} = this;
                let {sortedInfo} = state;
                let {filteredInfo} = state;
                sortedInfo = sortedInfo || {};
                filteredInfo = filteredInfo || {};

                const columns = [
                    {
                        title: 'Address',
                        dataIndex: 'address',
                        key: 'address',
                        width: '10%',
                        render: text => <a href={"#!"}>{text}</a>,
                        sorter: (a, b) => a.address.localeCompare(b.address),
                        sortOrder: sortedInfo.columnKey === 'address' && sortedInfo.order,
                    },
                    {
                        title: 'Connected',
                        width: '5%',
                        dataIndex: 'connected',
                        key: 'connected',
                        render: connected => connected ? '🟢' : '🔴',
                        sorter: (a, b) => (a.connected ? 1 : 0) - (b.connected ? 1 : 0),
                        sortOrder: sortedInfo.columnKey === 'connected' && sortedInfo.order,
                    },
                    {
                        title: 'Role',
                        width: '5%',
                        dataIndex: 'role',
                        key: 'role',
                        sorter: (a, b) => a.role.localeCompare(b.role),
                        sortOrder: sortedInfo.columnKey === 'role' && sortedInfo.order,
                    },
                    {
                        title: 'Latency',
                        width: '5%',
                        dataIndex: 'latency',
                        key: 'latency',
                        render: latency => typeof latency === 'number' ? `${latency} ms` : '~',
                        sorter: (a, b) => a.latency - b.latency,
                        sortOrder: sortedInfo.columnKey === 'latency' && sortedInfo.order,
                    },
                    {
                        title: 'HTTP transport',
                        width: '7%',
                        dataIndex: 'http',
                        key: 'http',
                        render: http => http ? '🟢' : '🔴',
                        sorter: (a, b) => (a.http ? 1 : 0) - (b.http ? 1 : 0),
                        sortOrder: sortedInfo.columnKey === 'http' && sortedInfo.order,
                    },
                    {
                        title: 'Action',
                        key: 'action',
                        render: (text, node) => (
                            <span>
                        {node.http ? <ActionButton action={"switch"} node={node}>Switch</ActionButton> : ''}
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
                    <img
                        src={raftIcon}
                        style={{width: 40, height: 40}}
                        alt="Raft"
                        aria-hidden={true}
                    /> Raft
                </Header>
                <PageContent>
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

                </PageContent>
            </div>
        )
    }

}

export default Raft;
