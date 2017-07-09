const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import * as utils from "./utils.js";
import ClassNotificationView from "./ClassNotificationView.js";
import ReactMarkdown from "react-markdown";
import Chat from "./Chat.js";
const toMarkdown = require("to-markdown");
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

export default class ChatList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            inChat: false,
            targetUser: "",
            newChatTarget: "",
            rows: []
        };
    }

    async updateList() {
        let r = await network.makeRequest("POST", "/api/pm/list", {
            limit: 10000
        });
        r = JSON.parse(r);
        if(r.err !== 0) {
            throw r;
        }

        let targetTimes = {};
        let realNames = {};

        r.from_me.map(v => {
            realNames[v.to] = v.to_real_name;

            return {
                u: v.to,
                time: v.time
            };
        }).forEach(v => targetTimes[v.u] = v.time > (targetTimes[v.u] || 0) ? v.time : targetTimes[v.u]);
        r.to_me.map(v => {
            realNames[v.from] = v.from_real_name;

            return {
                u: v.from,
                time: v.time
            };
        }).forEach(v => targetTimes[v.u] = v.time > (targetTimes[v.u] || 0) ? v.time : targetTimes[v.u]);

        console.log(targetTimes);

        this.setState({
            rows: Object.keys(targetTimes).sort((a, b) => targetTimes[b] - targetTimes[a]).map(u => {
                return {
                    target: realNames[u],
                    time: utils.getRelativeTime(targetTimes[u]),
                    intoButton: ( <Button colored onClick={() => this.into(u)}>进入</Button> )
                };
            })
        });
    }

    into(u) {
        Chat.preload({
            to: u
        });
        view.dispatch(Chat);
    }

    componentDidMount() {
        this.updateList();
    }

    render() {
        let body;
        if(this.state.inChat) {
            body = (
                <div>
                    <Chat to={this.state.targetUser} /><br />
                    <Button colored onClick={() => this.setState({ inChat: false })}>返回</Button>
                </div>
            );
        } else {
            body = (
                <div>
                    <DataTable
                        shadow={0}
                        rows={this.state.rows}
                        style={{width: "100%", display: this.state.inChat ? "none" : "block"}}
                    >
                        <TableHeader name="target">用户</TableHeader>
                        <TableHeader name="time">时间</TableHeader>
                        <TableHeader name="intoButton"></TableHeader>
                    </DataTable><br />
                    <Textfield
                        onChange={ev => this.setState({ newChatTarget: ev.target.value })}
                        label="用户名"
                        style={{width: "100%", marginTop: 0}}
                        value={this.state.newChatTarget}
                    /><br />
                    <Button colored raised onClick={() => this.into(this.state.newChatTarget)}>写私信</Button>
                </div>
            );
        }
        return (
            <Card shadow={0} className="main-card">
                <h3>私信</h3>
                {body}
            </Card>
        )
    }
}
