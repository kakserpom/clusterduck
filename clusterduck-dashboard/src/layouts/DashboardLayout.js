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

        const state = () => ({
            sidebarCollapsed: false,
            isMobile: window.innerWidth <= MOBILE_SIZE,
            clusterduck
        })

        this.state = state()

        this.nav = this.getNavigation()
        clusterduck.on('state', () => {
            this.nav = this.getNavigation()
            console.log(this.nav)
            this.setState(state())
            this.render()
        })
    }

    getNavigation() {
        const top =
           // [] ||
            [{
                name: 'UI Elements',
                icon: 'Layers',
                children: [
                    {
                        name: 'Buttons',
                        url: '/elements/buttons',
                    },
                    {
                        name: 'Grid',
                        url: '/elements/grid',
                    },
                    {
                        name: 'Alerts',
                        url: '/elements/alerts',
                    },
                    {
                        name: 'Typography',
                        url: '/elements/typography',
                    },
                    {
                        name: 'Cards',
                        url: '/elements/cards',
                    },
                    {
                        name: 'Tabs',
                        url: '/elements/tabs',
                    },
                    {
                        name: 'Tables',
                        url: '/elements/tables',
                    },
                    {
                        name: 'Breadcrumbs',
                        url: '/elements/breadcrumbs',
                    },
                    {
                        name: 'Forms',
                        url: '/elements/forms',
                    },
                    {
                        name: 'Modals',
                        url: '/elements/modals',
                    },
                    {
                        name: 'Loaders',
                        url: '/elements/loaders',
                    },
                    {
                        name: 'Avatars',
                        url: '/elements/avatars',
                    },
                    {
                        name: 'Progress Bars',
                        url: '/elements/progressbars',
                    },
                    {
                        name: 'Pagination',
                        url: '/elements/pagination',
                    },
                ],
            },
                {
                    name: 'Pages',
                    icon: 'File',
                    children: [
                        {
                            name: 'Blank',
                            url: '/pages/blank',
                        },
                        {
                            name: 'Sub Navigation',
                            url: '/pages/subnav',
                        },
                        {
                            name: '404',
                            url: '/pages/404',
                        },
                    ],
                },
                {
                    name: 'Apps',
                    icon: 'Cloud',
                    children: [
                        {
                            name: 'Analytics',
                            url: '/apps/analytics',
                        },
                        {
                            name: 'Invoice',
                            url: '/apps/invoice',
                        },
                        {
                            name: 'Activity Feed',
                            url: '/apps/feed',
                        },
                        {
                            name: 'CMS',
                            url: '/apps/cms',
                        },
                    ],
                },
                {
                    divider: true,
                },
                {
                    name: 'Widgets',
                    url: '/widgets',
                    icon: 'Package',
                    badge: {
                        text: 'NEW',
                    },
                }];
        return {
            top: [
                {
                    name: 'Home',
                    url: '/home',
                    icon: 'Home',
                },
                {
                    name: 'Clusters',
                    icon: 'Layers',
                    url: '/clusters/',
                    children: Object.entries(this.state.clusterduck.clusters).map(([name, cluster]) => (
                        {
                            name: cluster.name,
                            icon_url: cluster.software.logo,
                            url: '/clusters/' + cluster.name,
                        })),
                },
                {
                    name: 'Logs',
                    icon: 'File',
                    url: '/logs'
                },
            ].concat(top),
            bottom: [
                {
                    name: 'GitHub',
                    url: 'https://github.com/kakserpom/clusterduck',
                    icon: 'GitHub',
                    external: true,
                    target: '_blank',
                }
            ],
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
                            nav={this.nav}
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
