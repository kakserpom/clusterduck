import React, {Component} from 'react';
import {NavLink} from 'react-router-dom';
import NavSpacer from './components/NavSpacer';
import NavOverlay from './components/NavOverlay';
import NavDivider from './components/NavDivider';
import NavSingleItem from './components/NavSingleItem';
import NavDropdownItem from './components/NavDropdownItem';
import PageAlertContext from '../PageAlert/PageAlertContext';
import clusterduck from "../../../clusterduck";
import handleKeyAccessibility, {handleClickAccessibility} from "../../helpers/handleTabAccessibility";
import RaftIcon from '../../../assets/images/raft.svg';
import Cookies from 'js-cookie'

const MOBILE_SIZE = 992;

export default class SidebarNav extends Component {
    constructor(props) {
        super(props);
        this.state = {
            sidebarCollapsed: Cookies.get('sidebarCollapsed') === 'y',
            isMobile: window.innerWidth <= MOBILE_SIZE,
        }
    }

    isCollapsed() {
        return this.state.sidebarCollapsed
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

        clusterduck.state(ыstate => {
            this.setState({clusterduck})
        })
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
    }

    toggleSideCollapse() {
        this.setState(prevState => {
            const sidebarCollapsed = !prevState.sidebarCollapsed
            Cookies.set('sidebarCollapsed', sidebarCollapsed ? 'y' : 'n')
            return {sidebarCollapsed}
        })
        return !this.state.sidebarCollapsed
    };


    getNavigation() {
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
                    children: this.state.clusterduck ? Object.entries(this.state.clusterduck.clusters).map(([name, cluster]) => (
                        {
                            name: cluster.name,
                            icon_url: cluster.software.logo,
                            url: '/clusters/' + cluster.name,
                        })) : [],
                },
                {
                    name: 'Logs',
                    icon: 'File',
                    url: '/logs',
                    children: [
                        {
                            name: 'Stdout',
                            icon: 'ThumbsUp',
                            url: '/logs/stdout',
                        }, {
                            name: 'Stderr',
                            icon: 'ThumbsDown',
                            url: '/logs/stderr',
                        }
                    ]
                },
                {
                    name: 'Raft',
                    icon: RaftIcon,
                    url: '/raft'
                },
            ],
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


    render() {

        const {sidebarCollapsed} = this.state;
        const sidebarCollapsedClass = sidebarCollapsed ? 'side-menu-collapsed' : '';

        if (this.props.appDivRef.current) {
            this.props.appDivRef.current.className = `app ${sidebarCollapsedClass}`;
        }

        const navItems = items => {
            return items.map((item, index) => itemType(item, index));
        };

        const itemType = (item, index) => {
            if (item.children) {
                return <NavDropdownItem key={index} item={item} isSidebarCollapsed={sidebarCollapsed}/>;
            } else if (item.divider) {
                return <NavDivider key={index}/>;
            } else {
                return <NavSingleItem item={item} key={index}/>;
            }
        };

        const NavBrand = ({logo, logoText}) => {
            return (
                <div className="site-logo-bar">
                    <NavLink to="/" className="navbar-brand">
                        {logo && <img src={logo} alt=""/>}
                        {logoText && <span className="logo-text">{logoText}</span>}
                    </NavLink>
                </div>
            );
        };

        const nav = this.getNavigation();
        return (
            <PageAlertContext.Consumer>
                {consumer => {
                    const hasPageAlertClass = consumer.alert ? 'has-alert' : '';
                    return (
                        <div>
                            <div className={`app-sidebar ${hasPageAlertClass}`}>
                                <NavBrand logo={this.props.logo} logoText={this.props.logoText}/>
                                <nav>
                                    <ul id="main-menu">
                                        {navItems(nav.top)}
                                        <NavSpacer/>
                                        {navItems(nav.bottom)}
                                    </ul>
                                </nav>
                            </div>
                            {sidebarCollapsed && <NavOverlay onClick={this.toggleSidebar}/>}
                        </div>
                    );
                }}
            </PageAlertContext.Consumer>
        );
    }
}
