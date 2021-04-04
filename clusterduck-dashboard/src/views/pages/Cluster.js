import React from 'react';
import clusterduck from '../../clusterduck.js'
import {
//    Card,
//    CardBody,
    Row,
    Col,
    Table
} from 'reactstrap';
import CD_Component from "../../CD_Component";

class Cluster extends CD_Component {
    constructor(props) {
        super(props)
        const name = this.props.match.params.cluster
        clusterduck.state(state => this.safeSetState(state.clusters[name]))
    }

    render() {
        const heroStyles = {
            padding: '50px 0 70px'
        };

        const cluster = this.state

        if (!cluster) {
            return <div></div>
        }

        return (
            <div>
                <Row>
                    <Col md={6}>
                        <div className="home-hero" style={heroStyles}>
                            <h1><img
                                src={cluster.software.logo}
                                style={{width: 70, height: 70}}
                                alt={cluster.software.name}
                                aria-hidden={true}
                            /> {cluster.name}</h1>

                            <p className="text-muted">

                            </p>
                        </div>
                    </Col>
                </Row>

                <Table hover>
                    <thead>
                    <tr>
                        <th width={"10%"}>Address</th>
                        <th width={"10%"}>Active</th>
                        <th width={"10%"}>Available</th>
                        <th width={"10%"}>Spare</th>
                        <th width={"10%"}>Disabled</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {cluster.nodes.map(node => {
                        //      //<td>{JSON.stringify(node)}</td>
                        return <tr key={'node_' + node.addr}>
                            <td>{node.addr}</td>
                            <td>{node.active ? '🟢' : (node.spare ? '🟡' : '🔴')}</td>
                            <td>{node.available ? '✅' : '❌'}</td>
                            <td>{node.spare ? 'YES' : 'NO'}</td>
                            <td>{node.disabled ? 'YES' : 'NO'}</td>
                        </tr>
                    })}
                    </tbody>
                </Table>

            </div>
        );
    }

}

export default Cluster;
