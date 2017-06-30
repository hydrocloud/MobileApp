import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, ProgressBar } from "react-mdl";

import * as view from "./view.js";
const network = require("./network.js");
const user = require("./user.js");

import Me from "./Me.js";

export default class Welcome extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loggingIn: false
        };
    }

    async tryLoadSession() {
        try {
            let r = await network.makeRequest("POST", "/api/user/info");
            r = JSON.parse(r);
            if(r.err !== 0) {
                return;
            }
            user.loadInfoIntoGlobal(r);
            return view.dispatch(Me);
        } catch(e) {
            return;
        }
    }

    async login() {
        this.tryLoadSession();

        const clientToken = await window.oneidentity.login(document.getElementById("login-container"));

        this.setState({ loggingIn: true });
        
        let r = await network.makeRequest("POST", "/api/user/login", {
            client_token: clientToken
        });
        r = JSON.parse(r);
        if(r.err !== 0) {
            throw new Error(r.msg);
        }
        r = await network.makeRequest("POST", "/api/user/info");
        r = JSON.parse(r);
        if(r.err !== 0) {
            throw new Error(r.msg);
        }
        user.loadInfoIntoGlobal(r);
        this.setState({ loggingIn: false });
        return view.dispatch(Me);
    }

    render() {
        return (
            <div>
                <Button raised colored onClick={() => this.login()} style={{display: this.state.loggingIn ? "none" : "block"}}>登录</Button>
                <div style={{display: this.state.loggingIn ? "block" : "none"}}>
                    <ProgressBar indeterminate />
                </div>
            </div>
        )
    }
}
