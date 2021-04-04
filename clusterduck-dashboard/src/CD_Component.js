import {Component} from 'react';

class CD_Component extends Component {
    /**
     *
     * @param state
     */
    safeSetState(state) {
        if (this._ismounted) {
            this.setState(state)
        } else {
            // eslint-disable-next-line
            this.state = state
        }
    }

    componentDidMount() {
        this._ismounted = true;
    }

    componentWillUnmount() {
        this._ismounted = false;
    }
}


export default CD_Component;