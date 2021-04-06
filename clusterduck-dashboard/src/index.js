import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './registerServiceWorker';

import "bootstrap-css-only/css/bootstrap.min.css";

import App from './App';

import clusterduck from './clusterduck'
import "@fortawesome/fontawesome-free/css/all.min.css";
import "antd/dist/antd.css";

let port
if (process.env.REACT_APP_WS_PORT) {
    port = process.env.REACT_APP_WS_PORT
} else if (window.location.port !== 80) {
    port = window.location.port
}

clusterduck.connect('ws://' + window.location.hostname + (port ? ':' + port : '') + '/socket')


ReactDOM.render(<App/>, document.getElementById('app'));
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
