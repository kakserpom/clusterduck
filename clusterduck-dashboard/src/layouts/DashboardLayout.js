import React, {Component} from 'react';
import {Switch, Route, Redirect} from 'react-router-dom';
import {SidebarNav, Footer, PageContent, PageAlert, Page} from '../vibe';
import Logo from '../assets/images/rubber-duck.svg';
import routes from '../views';
import ContextProviders from '../vibe/components/utilities/ContextProviders';

export default class DashboardLayout extends Component {
    getSideBar() {
        return this.sideBar.current
    }

    constructor() {
        super()
        this.sideBar = React.createRef()

    }

    render() {
        const appDivRef = React.createRef()
        return (
            <ContextProviders>
                <div className={`app`} ref={appDivRef}>
                    <PageAlert/>
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
                                    <Route path={page.path} render={(props) => (
                                        <page.component {...props} layout={this}/>
                                    )} key={key}/>
                                ))}
                                <Redirect from="/" to="/home"/>
                            </Switch>
                        </Page>
                    </div>
                </div>
            </ContextProviders>
        );
    }
}
