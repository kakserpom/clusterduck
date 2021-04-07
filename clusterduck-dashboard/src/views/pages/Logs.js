import React, {useEffect} from 'react';
import clusterduck from '../../clusterduck.js'
import {Row, Col, NavItem, NavLink} from 'reactstrap';
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

        this.state = {tab: this.props.match.params.tab || 'stdout'}
    }

    componentDidMount() {
        this.setState({tab: this.props.match.params.tab || 'stdout'})
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const tab = this.props.match.params.tab || 'stdout'

        if (tab !== this.state.tab) {
            this.setState({tab})
        }
    }


    render() {
        const {tab} = this.state
        console.log('render tab = ' + tab)

        const LogStream = (props) => {
            const {type} = props
            const content = React.createRef()
            const code = React.createRef()
            const anchor = React.createRef()
            useEffect(() => {
                const connectedHandler = () => {
                    content.current.innerHTML = ''
                    clusterduck.command('tail', type)
                }

                const handleResize = () => {
                    code.current.style.height = window.innerHeight - 100;

                }
                window.addEventListener('resize', handleResize);

                const tailHandler = chunk => {
                    content.current.innerHTML += ansiConvert.toHtml(chunk)
                    anchor.current.scrollIntoView({behavior: "smooth"});
                }

                clusterduck.on('tail:' + type, tailHandler)
                clusterduck.connected(connectedHandler)

                return () => {
                    window.removeEventListener('resize', handleResize);
                    clusterduck.off('tail:' + type, tailHandler)
                    clusterduck.off('connected', connectedHandler)
                }

            })

            const ROOT_CSS = css({
                display: 'block',
                overflowY: 'scroll',
                minWidth: '100%',
                height: window.innerHeight - 100,
                padding: '10px',
                marginLeft: '-32px',
                marginBottom: '-32px',
            });

            return <code className={'bg-dark ' + ROOT_CSS} ref={code}>
                <div ref={content}/>
                <div style={{float: "left", clear: "both", height: "100px"}} ref={anchor}/>
            </code>
        }

        const that = this
        const TabHeader = withRouter(({history, children, name}) => {
            return (
                <NavItem>
                    <NavLink
                        href={'/logs/' + name}
                        className={classnames({active: tab === name})}
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
                            <h1><Feather.File/> Logs / {tab}</h1>
                        </div>
                    </Col>
                </Row>
                <LogStream type={tab}/>
            </div>
        )
    }

}

export default Logs;
