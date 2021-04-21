import React from 'react';
import clusterduck from '../../clusterduck.js'
import {
    Card,
    CardBody,
    Row,
    Col, Breadcrumb, BreadcrumbItem
} from 'reactstrap';
import CD_Component from "../../CD_Component";
import {Link} from "react-router-dom";
import {Header, PageContent} from "../../vibe";
import * as Feather from "react-feather";
import JsonBox from "../../components/json-box";
import prettyBytes from "pretty-bytes";
import CodeBox from "../../components/code-box";

class Home extends CD_Component {
    constructor() {
        super()
        clusterduck.state(state => this.safeSetState(state))
    }

    render() {
        const heroStyles = {
            padding: '0 0 70px'
        };

        const {clusters} = this.state

        return (
            <div>
                <Header {...this.props}>
                    <Breadcrumb>
                        <BreadcrumbItem active={true}><Feather.Home
                            style={{width: 20, height: 20}}/> Home</BreadcrumbItem>
                    </Breadcrumb>
                </Header>
                <PageContent>
                    <div>
                        <Row>
                            <Col md={6}>
                                <div className="home-hero" style={heroStyles}>
                                    <h1>Dashboard <span role={"img"} aria-label={"rocket"}>🚀</span></h1>
                                    <p className="text-muted">

                                    </p>
                                </div>
                            </Col>
                        </Row>
                        <Row key={'memory'}>
                            <Col md={1.7}>
                                <Card>
                                    <CardBody className="display-flex">
                                        <div className="m-l">
                                            <h2 className="h4">Memory usage</h2>
                                            <CodeBox>
                                            {Object.entries(clusterduck.memory.usage || {}).map(([key, value]) =>
                                                <p key={key}>{key}: {prettyBytes(value)}</p>
                                            )}
                                            </CodeBox>
                                        </div>
                                    </CardBody>
                                </Card>
                            </Col>
                            <Col md={1.7}>
                                <Card>
                                    <CardBody className="display-flex">
                                        <div className="m-l">
                                            <h2 className="h4">Memory Statistics</h2>
                                            <CodeBox>
                                                {Object.entries(clusterduck.memory.stat || {}).map(([key, value]) =>
                                                    <p key={key}>{key}: {prettyBytes(value)}</p>
                                                )}
                                            </CodeBox>
                                        </div>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                        {Object.entries(clusters || {}).map(([name, cluster]) => {
                            return <Row key={'cluster_' + name}>
                                <Col md={6}>
                                    <Card>
                                        <Link to={"/clusters/" + cluster.name} style={{
                                            textDecoration: 'none',
                                            color: 'black'
                                        }}>
                                            <CardBody className="display-flex">
                                                <img
                                                    src={cluster.software.logo}
                                                    style={{width: 70, height: 70}}
                                                    alt={cluster.software.name}
                                                    aria-hidden={true}
                                                />
                                                <div className="m-l">
                                                    <h2 className="h4">{cluster.name}</h2>
                                                    <p className="text-muted">
                                                        Nodes: {cluster.nodes.length}
                                                    </p>
                                                </div>
                                            </CardBody>
                                        </Link>
                                    </Card>
                                </Col>
                            </Row>
                        })}
                    </div>
                </PageContent>
            </div>
        );
    }
}

export default Home;
