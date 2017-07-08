import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, ProgressBar } from "react-mdl";

import * as view from "./view.js";
const network = require("./network.js");
const user = require("./user.js");
const config = require("./config.js");
import EventHub from "./EventHub.js";

import Me from "./Me.js";

export default class Welcome extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loggingIn: false,
            requestingLogin: false
        };
    }

    async tryLoadSession() {
        try {
            let r = await network.makeRequest("POST", "/api/user/info");
            r = JSON.parse(r);
            if(r.err !== 0) {
                return;
            }
            console.log(r);
            return EventHub.getDefault().fireEvent("login_complete", {});
        } catch(e) {
            return;
        }
    }

    async tryAutoLogin() {
        if(!localStorage.persistentToken) {
            return;
        }

        console.log("Trying auto login");

        let pt = localStorage.persistentToken;

        console.log("Length of persistent token: " + pt.length);

        let r = await network.makeRequest("POST", "/api/user/auto_login", {
            persistent_token: pt
        });

        r = JSON.parse(r);

        if(r.err === 0) {
            return EventHub.getDefault().fireEvent("login_complete", {});
        }
    }

    async requestLogin() {
        let r = await network.makeRequest("POST", "/api/user/request_login");
        r = JSON.parse(r);
        if(r.err !== 0) {
            throw r;
        }
        return r.request_id;
    }

    async login() {
        console.log("login");
        let requestId = await this.requestLogin();

        listenForClientToken(requestId);

        window.oneidentity.disableStyles();

        this.setState({
            requestingLogin: true
        });
        
        let loginContainer = document.getElementById("login-container");
        const clientToken = await window.oneidentity.login(loginContainer, false, config.CLOUD_PREFIX + "/api/auth/callback?request_id=" + requestId);
        
        this.setState({
            requestingLogin: false
        });

        this.setState({ loggingIn: true });
        
        let r = await network.makeRequest("POST", "/api/user/login", {
            client_token: clientToken
        });
        r = JSON.parse(r);
        if(r.err !== 0) {
            throw new Error(r.msg);
        }
        localStorage.persistentToken = r.persistent_token;

        r = await network.makeRequest("POST", "/api/user/info");
        r = JSON.parse(r);
        if(r.err !== 0) {
            throw new Error(r.msg);
        }
        this.setState({ loggingIn: false });
        return EventHub.getDefault().fireEvent("login_complete", {});
    }

    async componentDidMount() {
        EventHub.getDefault().fireEvent("hide_header");
        await this.tryLoadSession();
        await this.tryAutoLogin();
    }

    render() {
        return (
            <div style={{
                position: "fixed",
                top: "0px",
                left: "0px",
                width: "100%",
                height: "100%",
                zIndex: "10",
                backgroundImage: "url(images/login-bg.jpg)",
                backgroundPosition: "center",
                backgroundSize: "cover",
                padding: "30px 30px",
                boxSizing: "border-box",
                textAlign: "center"
            }}>
                <Button onClick={() => this.login()} disabled={this.state.requestingLogin} style={{
                    display: this.state.loggingIn ? "none" : "block",
                    margin: "auto",
                    position: "absolute",
                    top: "0px",
                    bottom: "0px",
                    left: "0px",
                    right: "0px",
                    width: "120px",
                    backgroundColor: "#FFFFFF",
                    color: "#333333"
                }}>{this.state.requestingLogin ? "正在登录" : "登录"}</Button><br />
                <div id="login-container" style={{display: this.state.requestingLogin ? "block" : "none"}}></div><br />
                <div style={{
                    display: this.state.loggingIn ? "block" : "none",
                    margin: "auto",
                    position: "absolute",
                    top: "0px",
                    bottom: "0px",
                    left: "0px",
                    right: "0px",
                    width: "240px",
                    height: "10px"
                }}>
                    <ProgressBar indeterminate />
                </div>
            </div>
        )
    }
}

function listenForClientToken(requestId) {
    let intervalId = setInterval(async () => {
        let r = await network.makeRequest("POST", "/api/user/check_login_status", {
            request_id: requestId
        });
        r = JSON.parse(r);
        if(r.err === 0){
            clearInterval(intervalId);
            sessionStorage.oneidentityClientToken = r.client_token;
        }
    }, 1000);
}
