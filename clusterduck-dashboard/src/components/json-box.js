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

export default function JsonBox({value, theme}) {
    const AnsiConverter = require('ansi-to-html')
    const cj = require('color-json')
    const ansiConvert = new AnsiConverter({
        newline: true,
        escapeXML: false
    });
    theme = theme || 'light'

    const ansi = escapeHtml(cj(value)).replaceAll(/^\s+/mg, match => {
        return match.replaceAll(/\x20|\t/g, match => (
            {'\x20': '&nbsp;', '\t': '&nbsp;&nbsp;&nbsp;'}[match]
        ))
    })

    const __html = ansiConvert.toHtml(ansi)

    const ROOT_CSS = css({
        display: 'block',
        padding: '10px',
    });
    return <code className={'bg-' + theme + ' ' + ROOT_CSS}
                 dangerouslySetInnerHTML={{__html}}/>
}
