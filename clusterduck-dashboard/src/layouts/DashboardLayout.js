import React, {Component} from 'react';
import {Switch, Route, Redirect} from 'react-router-dom';
import {SidebarNav, PageAlert, Page} from '../vibe';
import Logo from '../assets/images/logo.svg';
import routes from '../views';
import ContextProviders from '../vibe/components/utilities/ContextProviders';
import clusterduck from '../clusterduck';
import RingLoader from 'react-spinners/RingLoader';
import {css} from '@emotion/core';
import ErrorPage from "../views/pages/404";

export default class DashboardLayout extends Component {
    getSideBar() {
        return this.sideBar.current;
    }

    constructor() {
        super();
        this.sideBar = React.createRef();

        let port;
        if (process.env.REACT_APP_WS_PORT) {
            port = process.env.REACT_APP_WS_PORT;
        } else if (window.location.port !== 80) {
            port = window.location.port;
        }
        clusterduck.connect('ws://' + window.location.hostname + (port ? ':' + port : '') + '/socket');
        clusterduck.on('connected', () => {
                document.getElementById('overlay').style.display = 'none';
        });
        clusterduck.on('disconnected', () => {
            document.getElementById('overlay').style.display = 'block';
        });
    }

    render() {
        const appDivRef = React.createRef();

        const override = css`
            display: block;
            top: 50%;
            left: 50%;
            margin-top: -10em;
            margin-left: -5em;
            `;

        return (
            <ContextProviders>
                <div className={`app`} ref={appDivRef}>
                    <PageAlert/>
                    <div id={'overlay'}><RingLoader color={'yellow'} css={override} loading={true} size={150}/></div>
                    <div className="app-body">
                        <SidebarNav
                            ref={this.sideBar}
                            logo={Logo}
                            logoText="Clusterduck"
                            appDivRef={appDivRef}
                            {...this.props}
                        />
                        <Page>
                            <Switch>
                                {routes.map((page, key) => (
                                    <Route exact path={page.path} render={(props) => (
                                        <page.component {...props} layout={this}/>
                                    )} key={key}/>
                                ))}
                                <Redirect exact from="/" to="/home"/>
                                <Route path="/" render={(props) => (
                                    <ErrorPage {...props} layout={this}/>
                                )}/>
                            </Switch>
                        </Page>
                    </div>
                </div>
            </ContextProviders>
        );
    }
}
