const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

export default class WatchedQQGroupMessages extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            rows: [],
            details: null
        };
    }

    async update() {
        await qq.waitForInit();
        if(!qq.status.connected) return;

        let r = await network.makeRequest("POST", "/api/user/qq_connect/watched_group_messages");
        r = JSON.parse(r);
        assert(r.err === 0);

        let rows = [];
        for(let m of r.messages) {
            rows.push({
                fromQQ: m.from_qq,
                fromGroup: m.from_group,
                detailsButton: ( <Button colored onClick={() => this.showDetails(m)}>详情</Button>),
                time: this.getRelativeTime(m.time)
            });
        }

        this.setState({
            rows: rows
        });
    }

    async showDetails(m) {
        this.setState({
            details: (
                <div>
                    <span>群: {m.from_group}</span><br />
                    <span>来源 QQ: {m.from_qq}</span><br />
                    <span>时间: {new Date(m.time).toLocaleString()}</span><br />
                    <span>内容:</span><br />
                    <pre>{m.content}</pre>
                </div>
            )
        });
    }

    componentDidMount() {
        this.update();
    }

    getRelativeTime(t) {
        let c = Date.now();
        let dt = c - t;

        let dtDays = Math.floor(dt / 86400000);
        if(dtDays == 0) {
            return "今天";
        } else {
            return "" + dtDays + " 天前";
        }
    }
    
    render() {
        let body = null;

        if(this.state.details) {
            body = (
                <div style={{
                    fontSize: "14px",
                    lineHeight: "22px"
                }}>
                    {this.state.details}
                    <br />
                    <Button colored onClick={() => this.setState({details: null})}>返回</Button>
                </div>
            );
        } else {
            body = (
                <DataTable
                    shadow={0}
                    rows={this.state.rows}
                    style={{width: "100%"}}
                >
                    <TableHeader name="fromGroup">群</TableHeader>
                    <TableHeader name="time">时间</TableHeader>
                    <TableHeader name="detailsButton">详情</TableHeader>
                </DataTable>
            )
        }
        return (
            <Card shadow={0} className="main-card">
                <h3>我关注的 QQ 群消息</h3>
                {body}
            </Card>
        )
    }
}