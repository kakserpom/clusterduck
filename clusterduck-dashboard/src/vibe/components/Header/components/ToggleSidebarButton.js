/* eslint-disable */
import React, {useCallback} from 'react';
import {Button} from 'reactstrap';
import FA from 'react-fontawesome';

export default function SidebarToggleButton({layout}) {
    // console.log({Button: props.sideBar, ButtonCurrent: props.sideBar.current})
    const sideBar = layout.getSideBar()

    if (!sideBar) {
        return <span/>
    }

    const [val, set] = React.useState(document.getElementsByClassName('app')[0].classList.contains('side-menu-collapsed'));

    const collapsed = val
    const chevronClassName = collapsed ? 'is-collapsed' : 'is-not-collapsed';
    const screenReaderLabel = collapsed ? 'Expand Sidebar Navigation' : 'Collapse Sidebar Navigation';

    const handleClick = () => {
        set(sideBar.toggleSideCollapse())
    }

    if (!sideBar) {
        return <span/>
    }

    return (
        <Button onClick={handleClick} className={`m-r sidebar-toggle ${chevronClassName}`}
                aria-label={screenReaderLabel}>
            <FA name={'chevron-left'}/>
        </Button>
    );
}
