import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './registerServiceWorker';
import App from './App';

import clusterduck from './clusterduck'

let port
if (process.env.REACT_APP_WS_PORT) {
    port = process.env.REACT_APP_WS_PORT
} else if (window.location.port !== 80) {
    port = window.location.port
}

const socket = new WebSocket('ws://' + window.location.hostname + (port ? ':' + port : '') + '/socket');
socket.addEventListener('open', () => clusterduck.emit('connected', socket));

socket.addEventListener('message', ({data}) => {
    const packet = JSON.parse(data)
    clusterduck.emit('packet', packet)
    console.log('Message from server ', packet);
});

ReactDOM.render(<App/>, document.getElementById('app'));
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
