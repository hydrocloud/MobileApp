const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar } from "react-mdl";
import * as logging from "./logging.js";
import * as push from "./push.js";
import EventHub from "./EventHub.js";

const config = require("./config.js");

export default class About extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            pushReady: false
        };
    }

    async handlePushReady() {
        await EventHub.getDefault().waitForEvent("push_ready");
        this.setState({
            pushReady: true
        });
    }

    componentDidMount() {
        this.setState({
            pushReady: push.ready
        });
        if(!push.ready) this.handlePushReady();
    }
    
    render() {
        return (
            <Card shadow={0} className="main-card">
                <h3>关于</h3>
                <div style={{textAlign: "left"}}>
                    <p>通中云平台移动端应用</p>
                    <p>版本 {config.VERSION_STR}</p>
                    <p>&copy; 2017 hydrocloud.net.</p>
                    <p>Licensed under GPL v3</p>
                    <p><a href="https://github.com/hydrocloud/MobileApp">GitHub</a></p>
                    <p>推送服务状态: {this.state.pushReady ? "正常" : "异常"}</p>
                    <div>
                        <Button raised colored onClick={() => logging.sendConsoleOutputs()}>上报日志</Button>
                    </div>
                </div>
            </Card>
        );
    }
}
