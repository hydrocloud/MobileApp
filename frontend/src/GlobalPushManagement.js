const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import * as utils from "./utils.js";
import ClassNotificationView from "./ClassNotificationView.js";
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

export default class GlobalPushManagement extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            title: "",
            content: "",
            articleId: "",
            pushing: false
        };
    }

    async publish() {
        if(!confirm("你正在推送全局通知。此操作无法撤销。请再次确认。")) {
            return;
        }
        if(!this.state.title) {
            alert("请输入标题");
            return;
        }
        if(!this.state.content) {
            alert("请输入内容");
            return;
        }

        this.setState({
            pushing: true
        });
        let r = await network.makeRequest("POST", "/api/admin/push/global", {
            title: this.state.title,
            content: this.state.content,
            article_id: this.state.articleId
        });
        this.setState({
            pushing: false
        });

        r = JSON.parse(r);
        if(r.err !== 0){
            alert("推送失败: " + r.msg);
            console.log(r);
            return;
        }

        this.setState({
            title: "",
            content: ""
        });

        alert("推送成功。");
    }

    render() {
        return (
            <Card shadow={0} className="main-card">
                <h3>全局推送管理</h3>
                <div style={{display: this.state.pushing ? "none" : "block"}}>
                    <Textfield
                        onChange={ev => this.setState({ title: ev.target.value })}
                        label="通知标题"
                        value={this.state.title}
                    />
                    <Textfield
                        onChange={ev => this.setState({ content: ev.target.value })}
                        label="通知内容"
                        rows={3}
                        style={{width: "100%"}}
                        value={this.state.content}
                    /><br />
                    <Textfield
                        onChange={ev => this.setState({ articleId: ev.target.value })}
                        label="文章 ID"
                        value={this.state.articleId}
                    />
                    <Button raised colored onClick={() => this.publish()}>推送</Button>
                </div>
                <ProgressBar indeterminate style={{display: this.state.pushing ? "block" : "none"}} />
            </Card>
        );
    }
}
