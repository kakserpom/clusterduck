import React from 'react';
import {NavLink} from 'react-router-dom';
import * as Feather from 'react-feather';
import NavBadge from './NavBadge';

const NavSingleItem = ({item}) => {
    let Icon = null
    if (item.icon) {
        if (item.icon.substr(0, 1) === '/') {
            Icon = props => {
                return <img alt="Icon" src={item.icon} {...props} aria-hidden={true}/>
            }
        } else if (Feather[item.icon]) {
            Icon = Feather[item.icon]
        }
    } else if (item.icon_url) {
        Icon = props => {
            return <img alt="Icon" src={item.icon_url} {...props} aria-hidden={true}/>
        }
    }
    if (item.external) {
        const rel = item.target && item.target === '_blank' ? 'noopener noreferrer' : null;

        return (
            <li className="nav-item">
                <a href={item.url} target={item.target} rel={rel}>
                    {Icon && <Icon className="side-nav-icon"/>}
                    <span className="nav-item-label">{item.name}</span>
                    {item.badge && <NavBadge color={item.badge.variant} text={item.badge.text}/>}
                </a>
            </li>
        );
    } else {
        // Force relative URLs to start with a slash
        const url = item.url.charAt(0) === '/' ? item.url : `/${item.url}`;
        return (
            <li className="nav-item">
                <NavLink to={url} activeClassName="active">
                    {Icon && <Icon className="side-nav-icon"/>}
                    <span className="nav-item-label">{item.name}</span>
                    {item.badge && <NavBadge color={item.badge.variant} text={item.badge.text}/>}
                </NavLink>
            </li>
        );
    }
};

export default NavSingleItem;
