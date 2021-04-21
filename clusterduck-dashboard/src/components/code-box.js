import {css} from "@emotion/css";
import React from "react";

function escapeHtml(text) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function (m) {
        return map[m];
    });
}

export default function CodeBox({value, children, theme}) {
    const ROOT_CSS = css({
        display: 'block',
        padding: '10px',
    });
    theme = theme || 'light'
    if (value) {
        const __html = escapeHtml(value).replaceAll(/^[\s]+/mg, match => {
            return match.replaceAll(/\x20|\t/g, match => (
                {
                    '\x20': '&nbsp;',
                    '\t': '&nbsp;&nbsp;&nbsp;',
                }[match]
            ))
        }).replaceAll(/\n/g, '<br/>')
        return <code className={'bg-' + theme + ' ' + ROOT_CSS}
                     dangerouslySetInnerHTML={{__html}}/>
    } else {
        return <code className={'bg-' + theme + ' ' + ROOT_CSS}>{children}</code>
    }

}
