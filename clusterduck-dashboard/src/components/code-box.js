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

export default function CodeBox({value}) {

    const __html = escapeHtml(value).replaceAll(/^[\s]+/mg, match => {
        return match.replaceAll(/\x20|\t/g, match => (
            {
                '\x20': '&nbsp;',
                '\t': '&nbsp;&nbsp;&nbsp;',
            }[match]
        ))
    }).replaceAll(/\n/g, '<br/>')

    const ROOT_CSS = css({
        display: 'block',
        padding: '10px',
    });
    return <code className={'bg-dark ' + ROOT_CSS}
                 dangerouslySetInnerHTML={{__html}}/>
}
