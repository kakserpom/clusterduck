import React, {Component} from 'react';
import {Switch, Route, Redirect} from 'react-router-dom';
import {SidebarNav, Footer, PageContent, PageAlert, Page} from '../vibe';
import Logo from '../assets/images/rubber-duck.svg';
import routes from '../views';
import ContextProviders from '../vibe/components/utilities/ContextProviders';
import handleKeyAccessibility, {handleClickAccessibility} from '../vibe/helpers/handleTabAccessibility';
import clusterduck from '../clusterduck.js'

const MOBILE_SIZE = 992;

export default class DashboardLayout extends Component {
    constructor(props) {
        super(props);

        this.state = {
            sidebarCollapsed: false,
            isMobile: window.innerWidth <= MOBILE_SIZE,
        }
    }

    handleResize = () => {
        if (window.innerWidth <= MOBILE_SIZE) {
            this.setState({sidebarCollapsed: false, isMobile: true});
        } else {
            this.setState({isMobile: false});
        }
    };

    componentDidUpdate(prev) {
        if (this.state.isMobile && prev.location.pathname !== this.props.location.pathname) {
            this.toggleSideCollapse();
        }
    }

    componentDidMount() {
        window.addEventListener('resize', this.handleResize);
        document.addEventListener('keydown', handleKeyAccessibility);
        document.addEventListener('click', handleClickAccessibility);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
    }

    toggleSideCollapse = () => {
        this.setState(prevState => ({sidebarCollapsed: !prevState.sidebarCollapsed}));
    };


    render() {
        const {sidebarCollapsed} = this.state;
        const sidebarCollapsedClass = sidebarCollapsed ? 'side-menu-collapsed' : '';
        return (
            <ContextProviders>
                <div className={`app ${sidebarCollapsedClass}`}>
                    <PageAlert/>
                    <div className="app-body">
                        <SidebarNav
                            logo={Logo}
                            logoText="Clusterduck"
                            isSidebarCollapsed={sidebarCollapsed}
                            toggleSidebar={this.toggleSideCollapse}
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
