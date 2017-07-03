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

export default class ClassNotifications extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            rows: [],
            details: null
        };
    }

    async update() {
        let limit = this.props.extended ? 100 : 5;

        let r = await network.makeRequest("POST", "/api/student/class_notification/recent", {
            limit: limit
        });
        r = JSON.parse(r);
        assert(r.err === 0);

        let rows = [];
        for(let m of r.notifications) {
            rows.push({
                publisher: m.publisher,
                detailsButton: ( <Button colored onClick={() => this.showDetails(m)}>详情</Button>),
                time: utils.getRelativeTime(m.time)
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
                    <span>发布者: {m.publisher}</span><br />
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
                    <TableHeader name="publisher">发布者</TableHeader>
                    <TableHeader name="time">时间</TableHeader>
                    <TableHeader name="detailsButton">详情</TableHeader>
                </DataTable>
            )
        }
        return (
            <Card shadow={0} className="main-card">
                <h3>班级通知</h3>
                {body}<br />
                <Button colored style={{display: this.props.extended ? "none" : "block"}} onClick={() => view.dispatch(ClassNotificationView)}>更多</Button>
            </Card>
        )
    }
}