const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar } from "react-mdl";

import * as view from "./view.js";
import Me from "./Me.js";
const network = require("./network.js");
const user = require("./user.js");

export default class Verify extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            doingZhixueLogin: false
        };
    }

    async requestZhixueVerification() {
        this.setState({
            doingZhixueLogin: true
        });

        const username = document.getElementById("zhixue-username").value;
        const pw = document.getElementById("zhixue-password").value;

        let r = {err: -1};
        try {
            r = JSON.parse(await network.makeRequest("POST", "/api/user/verify/zhixue", {
                username: username,
                password: pw
            }));
            assert(r.err === 0);
            view.dispatch(Me);
        } catch(e) {
            console.log(e);
            alert("验证失败。请检查你的智学网账号和密码是否正确。");
        }
        this.setState({
            doingZhixueLogin: false
        });
    }

    render() {
        try {
            return (
                    <Card shadow={0} className="main-card">
                        <h3>身份验证</h3>
                        <div style={{textAlign: "left"}}>
                            <p>欢迎。</p>
                            <p>我们需要验证你的智学网账号来确认身份。</p>
                        </div>
                        <form action="javascript:;" style={{display: this.state.doingZhixueLogin ? "none" : "block"}}>
                            <Textfield
                                id="zhixue-username"
                                label="用户名"
                                floatingLabel
                                style={{width: '100%'}}
                            /><br />
                            <Textfield
                                id="zhixue-password"
                                type="password"
                                label="密码"
                                floatingLabel
                                style={{width: '100%'}}
                            /><br />
                            <Button raised colored onClick={() => this.requestZhixueVerification()}>确认</Button>
                        </form>
                        <div style={{display: this.state.doingZhixueLogin ? "block" : "none"}}>
                            <ProgressBar indeterminate />
                        </div>
                    </Card>
            );
        } catch(e) {
            console.log(e);
        }
    }
}
