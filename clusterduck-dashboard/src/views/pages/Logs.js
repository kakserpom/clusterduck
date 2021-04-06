import React, {useEffect} from 'react';
import clusterduck from '../../clusterduck.js'
import {Row, Col, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import CD_Component from "../../CD_Component";
import classnames from "classnames";
import {withRouter} from 'react-router-dom';
import * as Feather from 'react-feather';
import {css} from '@emotion/css';


const AnsiConverter = require('ansi-to-html');
const ansiConvert = new AnsiConverter({
    newline: true,
    escapeXML: true,
    stream: false
});

class Logs extends CD_Component {
    constructor(props) {
        super(props)
        this.tab = this.props.match.params.tab || 'stdout'
    }

    render() {
        const cluster = this.state

        const LogStream = (props) => {
            const {type} = props
            const code = React.createRef()
            const anchor = React.createRef()
            useEffect(() => {
                const connectedHandler = () => {
                    code.current.innerHTML = ''
                    clusterduck.command('tail', type)
                }

                const tailHandler = chunk => {
                    code.current.innerHTML += ansiConvert.toHtml(chunk)
                    anchor.current.scrollIntoView({ behavior: "smooth" });
                }

                clusterduck.on('tail:' + type, tailHandler)
                clusterduck.connected(connectedHandler)

                return () => {
                    clusterduck.off('tail:' + type, tailHandler)
                    clusterduck.off('connected', connectedHandler)
                }

            })
            return <code className={'bg-dark ' + ROOT_CSS}>
                <div ref={code}/>
                <div style={{ float:"left", clear: "both" }} ref={anchor}/>
            </code>
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

        const ROOT_CSS = css({
            display: 'block',
            overflowY: 'scroll',
            maxHeight: '600px',
            minWidth: '100%',
            padding: '10px',
        });

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
                            {this.tab === 'stdout' ? <LogStream type={"stdout"}/> : ''}
                        </TabPane>
                        <TabPane tabId="stderr">
                            {this.tab === 'stderr' ? <LogStream type={"stderr"}/> : ''}
                        </TabPane>
                    </TabContent>
                </div>

            </div>
        )
    }

}

export default Logs;
