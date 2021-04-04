import React  from 'react';
import clusterduck from '../../clusterduck.js'
import {
  Card,
  CardBody,
  Row,
  Col
} from 'reactstrap';
import CD_Component from "../../CD_Component";

class Dashboard extends CD_Component {
  constructor() {
    super()
    clusterduck.state(state => this.safeSetState(state))
  }

  render() {
    const heroStyles = {
      padding: '50px 0 70px'
    };

    const {clusters} = this.state

    return (
      <div>
        <Row>
          <Col md={6}>
            <div className="home-hero" style={heroStyles}>
              <h1>Clusterduck</h1>
              <p className="text-muted">
               Dashboard
              </p>
            </div>
          </Col>
        </Row>
        {Object.entries(clusters || {}).map(([name, cluster]) => {
          console.log(cluster)
          return <Row key={'cluster_' + name}>
            <Col md={6}>
              <Card>
                <CardBody className="display-flex">
                  <img
                      src={cluster.software.logo}
                      style={{ width: 70, height: 70 }}
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
              </Card>
            </Col>
          </Row>
        })}
      </div>
    );
  }
}

export default Dashboard;
