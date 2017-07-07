const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
const network = require("./network.js");
const user = require("./user.js");

export default class ServiceAuthNotice extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            authorized: false
        };
    }

    async updateStatus() {
        let r = await network.makeRequest("POST", "/api/user/service_auth_status");
        r = JSON.parse(r);

        if(r.err !== 0) {
            console.log(r);
            return;
        }

        this.setState({
            loaded: true,
            authorized: r.authorized
        });
    }

    componentDidMount() {
        this.updateStatus();
    }

    render() {
        if(this.state.authorized || !this.state.loaded) return <div></div>;

        return (
            <div>
                <Card shadow={0} className="main-card" style={{height: "100px"}}>
                    <p style={{color: "rgb(233, 30, 99)", fontSize: "14px", lineHeight: "28px"}}>请在 <a href="https://oneidentity.me">OneIdentity 个人中心</a> 授权服务<strong>通中云平台</strong>。<br />完成授权前，部分功能将不可用。</p>
                </Card>
            </div>
        );
    }
}
