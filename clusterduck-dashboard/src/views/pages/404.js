import React from 'react';
import {NavLink} from 'react-router-dom';
import {Header, PageContent} from "../../vibe";
import CD_Component from "../../CD_Component";
import clusterduck from "../../clusterduck";
class ErrorPage extends CD_Component {
    constructor() {
        super()
        clusterduck.state(state => this.safeSetState(state))
    }

    render() {
        return (
            <div>
                <Header {...this.props}></Header>
                <PageContent>
                    <div>
                        <div className="m-t-xxl text-center">
                            <h1 className="error-number">404</h1>
                            <h3 className="m-b">Sorry but we couldnt find this page. It doesn't exist!</h3>
                            <NavLink to={'/home'}>Go Home!</NavLink>
                        </div>
                    </div>
                </PageContent>
            </div>
        );
    }
}

export default ErrorPage;
