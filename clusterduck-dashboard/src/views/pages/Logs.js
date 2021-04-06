import React from 'react';
import clusterduck from '../../clusterduck.js'
import {Row, Col, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import CD_Component from "../../CD_Component";
import classnames from "classnames";
import {withRouter} from 'react-router-dom';
import * as Feather from 'react-feather';

const AnsiConverter = require('ansi-to-html');
const ansiConvert = new AnsiConverter();

class Logs extends CD_Component {
    constructor(props) {
        super(props)
        this.tab = this.props.match.params.tab || 'stdout'
    }

    render() {
        const cluster = this.state

        class LogStream extends React.Component {
            componentDidMount() {
                this.code.innerHTML += ansiConvert.toHtml('123')
            }

            render() {

                return <code ref={code => this.code = code}
                             className="bg-dark stdout"
                             style={{
                                 display: 'block',
                                 overflowY: 'scroll',
                                 maxHeight: '75vh !important',
                                 minWidth: '100%',
                                 padding: '10px',
                             }}/>
            }
        }

        const that = this
        const TabHeader = withRouter(({history, children, name}) => {
            return (
                <NavItem>
                    <NavLink
                        href={'/logs/' + name}
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

        return (
            <div>
                <Row>
                    <Col>
                        <div>
                            <h1><Feather.File/> Logs</h1>
                        </div>
                    </Col>
                </Row>
                <div>
                    <Nav tabs>
                        <TabHeader name={"stdout"}><Feather.ThumbsUp/> Stdout</TabHeader>
                        <TabHeader name={"stderr"}><Feather.ThumbsDown/> Stderr</TabHeader>
                    </Nav>
                    <TabContent activeTab={this.tab}>
                        <TabPane tabId="stdout">
                            <LogStream type={"stdout"}/>
                        </TabPane>
                    </TabContent>
                </div>

            </div>
        )
    }

}

export default Logs;
