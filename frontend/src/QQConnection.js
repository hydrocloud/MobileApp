const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

export default class QQConnection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            info: ""
        };
    }

    async disconnect() {
        this.setState({
            info: ( <ProgressBar indeterminate /> )
        });

        await network.makeRequest("POST", "/api/user/qq_connect/disconnect");
        this.showConnectStatus();
    }

    async showConnectStatus() {
        await qq.waitForInit();
        await qq.update();
        let status = qq.status;

        let info = null;

        if(status.connected) {
            info = (
                <div style={{
                    fontSize: "14px",
                    lineHeight: "22px"
                }}>
                    <span>关联账号: {status.qq}</span><br />
                    <span>关联时间: {new Date(status.connect_time).toLocaleString()}</span><br />
                    <Button accent onClick={() => this.disconnect()}>解除关联</Button>
                </div>
            );
        } else {
            info = (
                <div>
                    <Button colored raised onClick={() => this.requestConnect()}>关联 QQ</Button>
                </div>
            )
        }

        this.setState({
            info: info
        });
    }

    async requestConnect() {
        this.setState({
            info: ( <ProgressBar indeterminate /> )
        });

        let r = await network.makeRequest("POST", "/api/user/qq_connect/request")
        r = JSON.parse(r);
        assert(r.err === 0);
        
        let reqId = r.request_id;

        this.setState({
            info: (
                <div style={{
                    fontSize: "14px",
                    lineHeight: "22px"
                }}>
                    <span>请将你的用户名和以下数字提供给我们的 QQ 机器人来验证:</span><br />
                    <strong>{reqId}</strong><br />
                    <span>在标准的机器人实现中，你通常只需发送指令 <code>/connect {user.info.username} {reqId}</code> 即可。</span><br />
                    <span>机器人提示关联成功后，请点击确认。</span><br />
                    <Button colored raised onClick={() => this.showConnectStatus()}>确认</Button>
                </div>
            )
        });
    }

    componentDidMount() {
        this.showConnectStatus();
    }

    render() {
        return (
            <Card shadow={0} className="main-card">
                <h3>我的 QQ 账号</h3>
                <div>{this.state.info}</div>
            </Card>
        )
    }
}
