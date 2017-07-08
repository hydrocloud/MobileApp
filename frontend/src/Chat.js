const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import * as utils from "./utils.js";
import ClassNotificationView from "./ClassNotificationView.js";
import ReactMarkdown from "react-markdown";
const toMarkdown = require("to-markdown");
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

let preloaded = null;
let updateListeners = {};

export default class Chat extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            to: "",
            toRealName: "",
            messages: [],
            msgToSend: ""
        };
    }

    async updateConversation() {
        let to = this.state.to;

        let r = await network.makeRequest("POST", "/api/pm/conversation", {
            target: to
        });
        r = JSON.parse(r);

        if(r.err !== 0) {
            alert("私信更新失败。");
            console.log(r);
            return;
        }

        this.setState({
            toRealName: r.target_real_name
        });

        this.clearMessages();

        r.from_me.forEach(v => this.addMessage({
            id: v.id,
            from: user.info.username,
            to: to,
            content: v.content,
            time: v.time,
        }));

        r.to_me.forEach(v => this.addMessage({
            id: v.id,
            from: to,
            to: user.info.username,
            content: v.content,
            time: v.time
        }));
    }

    clearMessages() {
        this.setState({
            messages: []
        });
    }

    addMessage(msg) {
        this.state.messages.push(msg);

        this.setState({
            messages: this.state.messages
        });
    }

    async sendMessage() {
        if(!this.state.msgToSend) {
            alert("请输入私信内容");
            return;
        }

        let r = await network.makeRequest("POST", "/api/pm/send", {
            target: this.state.to,
            content: this.state.msgToSend
        });
        r = JSON.parse(r);
        if(r.err !== 0) {
            alert("发送失败。");
            console.log(r);
            return;
        }

        this.addMessage({
            id: r.pm_id,
            from: user.info.username,
            to: this.state.to,
            content: this.state.msgToSend,
            time: Date.now()
        });

        this.setState({
            msgToSend: ""
        });
    }

    componentDidMount() {
        this.setState({
            to: this.props.to || preloaded.to
        }, () => {
            if(this.state.to) updateListeners[this.state.to] = msg => this.addMessage(msg);
            this.updateConversation();
        });

        preloaded = null;
    }

    componentWillUnmount() {
        if(updateListeners[this.state.to]) delete updateListeners[this.state.to];
    }
    
    render() {
        let msgView = this.state.messages.sort((a, b) => a.time - b.time).map(v => (
            <div key={v.id} style={{marginBottom: "26px"}}>
                <pre>{v.content}</pre>
                <span style={{color: "#7F7F7F"}}>{v.from} {new Date(v.time).toLocaleString()}</span>
            </div>
        ));
        return (
            <div>
                <h3>与{this.state.toRealName} ({this.state.to}) 的私信</h3>
                <div>
                {msgView}
                </div>
                <Textfield
                    onChange={ev => this.setState({ msgToSend: ev.target.value })}
                    label=""
                    style={{width: "100%", marginTop: 0}}
                    value={this.state.msgToSend}
                /><br />
                <Button raised colored onClick={() => this.sendMessage()}>发送</Button><br />
            </div>
        )
    }

    static preload(data) {
        preloaded = data;
    }

    static onRecv(msg) {
        let listener = updateListeners[msg.to] || updateListeners[msg.from];
        if(listener) {
            listener(msg);
            return true;
        }
        return false;
    }
}
