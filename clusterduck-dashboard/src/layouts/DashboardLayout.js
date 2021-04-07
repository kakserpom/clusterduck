import React, {Component} from 'react';
import {Switch, Route, Redirect} from 'react-router-dom';
import {SidebarNav, Footer, PageContent, PageAlert, Page} from '../vibe';
import Logo from '../assets/images/rubber-duck.svg';
import routes from '../views';
import ContextProviders from '../vibe/components/utilities/ContextProviders';
export default class DashboardLayout extends Component {
    render() {
        const appDivRef = React.createRef()
        return (
            <ContextProviders>
                <div className={`app`} ref={appDivRef}>
                    <PageAlert/>
                    <div className="app-body">
                        <SidebarNav
                            logo={Logo}
                            logoText="Clusterduck"
                            appDivRef={appDivRef}
                            {...this.props}
                        />
                        <Page>
                            <PageContent>
                                <Switch>
                                    {routes.map((page, key) => (
                                        <Route path={page.path} component={page.component} key={key}/>
                                    ))}
                                    <Redirect from="/" to="/home"/>
                                </Switch>
                            </PageContent>
                        </Page>
                    </div>
                    <Footer>
                        <span></span>
                    </Footer>
                </div>
            </ContextProviders>
        );
    }
}
