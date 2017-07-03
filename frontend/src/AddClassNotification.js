const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import * as utils from "./utils.js";
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

export default class AddClassNotification extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            content: "",
            publishing: false,
            publishStatus: ""
        };
    }

    async publish() {
        if(!this.state.content) {
            this.setState({
                publishStatus: ( <span style={{color: "#FF0000"}}>你尚未输入通知内容。</span> )
            });
            return;
        }
        this.setState({
            publishing: true
        });
        let r = await network.makeRequest("POST", "/api/student/class_notification/add", {
            content: this.state.content
        });
        this.setState({
            publishing: false
        });
        r = JSON.parse(r);
        if(r.err !== 0) {
            this.setState({
                publishStatus: ( <span style={{color: "#FF0000"}}>发布失败: {r.msg}</span> )
            });
            return;
        }
        this.setState({
            content: "",
            publishStatus: ( <span style={{color: "#00CC00"}}>发布成功</span> )
        });
    }

    render() {
        return (
            <Card shadow={0} className="main-card">
                <h3>发布班级通知</h3>
                <Textfield
                    onChange={ev => this.setState({ content: ev.target.value })}
                    label=""
                    rows={7}
                    style={{width: "100%", marginTop: 0}}
                    value={this.state.content}
                /><br />
                <Button raised colored onClick={() => this.publish()} disabled={this.state.publishing}>发布</Button><br />
                <p>{this.state.publishStatus}</p>
            </Card>
        )
    }
}
