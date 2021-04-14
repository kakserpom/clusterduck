import React, {useEffect} from 'react';
import clusterduck from '../../clusterduck.js'
import CD_Component from "../../CD_Component";
import {css} from '@emotion/css';
import {Header} from "../../vibe";
import {Breadcrumb, BreadcrumbItem} from "reactstrap";
import * as Feather from 'react-feather';


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
                    code.current.style.height = window.innerHeight - 50

                }
                window.addEventListener('resize', handleResize)

                const tailHandler = chunk => {
                    content.current.innerHTML += ansiConvert.toHtml(chunk)
                    anchor.current.scrollIntoView({behavior: 'smooth'})
                }

                clusterduck.on('tail:' + type, tailHandler)
                clusterduck.connected(connectedHandler)

                return () => {
                    clusterduck.command('tail')
                    window.removeEventListener('resize', handleResize);
                    clusterduck.off('tail:' + type, tailHandler)
                    clusterduck.off('connected', connectedHandler)
                }

            })

            const ROOT_CSS = css({
                display: 'block',
                overflowY: 'scroll',
                minWidth: '100%',
                height: window.innerHeight - 50,
                padding: '10px',
            });

            return <code className={'bg-dark ' + ROOT_CSS} ref={code}>
                <div ref={content}/>
                <div style={{float: "left", clear: "both", height: "100px"}} ref={anchor}/>
            </code>
        }


        return (<div>
                <Header {...this.props}>
                    <Breadcrumb>
                        <BreadcrumbItem><Feather.File style={{width: 20, height: 20}}/> <a href={"#!"}>Logs</a></BreadcrumbItem>
                        <BreadcrumbItem active={true}>{tab}</BreadcrumbItem>
                    </Breadcrumb>
                </Header>
                <LogStream type={tab}/>
            </div>
        )
    }

}

export default Logs;
