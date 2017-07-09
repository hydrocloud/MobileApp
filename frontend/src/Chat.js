const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";
import { ChatFeed, Message } from "react-chat-ui";

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
        this.inputHeight = 67;
        this.sendButtonWidth = 80;
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
        let viewMessages = this.state.messages.sort((a, b) => a.time - b.time).map(v => new Message({
            id: v.from == user.info.username ? 0 : 1,
            message: v.content
        }));

        return (
            <div style={{
                position: "fixed",
                zIndex: 6,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: "#FFFFFF"
            }}>
                <h3>与{this.state.toRealName} ({this.state.to}) 的私信</h3>
                <div style={{
                    position: "absolute",
                    bottom: this.inputHeight + 5,
                    left: "0px",
                    right: "0px",
                    width: "100%",
                    height: window.innerHeight - this.inputHeight - 20
                }}>
                    <div style={{
                        position: "absolute",
                        bottom: 0,
                        width: "100%",
                        height: "100%"
                    }}>
                        <ChatFeed
                            messages={viewMessages}
                            isTyping={false}
                            hasInputField={false}
                            bubblesCentered={false}
                        />
                    </div>
                </div>
                <div style={{
                    position: "absolute",
                    bottom: "0px",
                    left: "0px",
                    right: "0px",
                    width: "100%",
                    height: this.inputHeight
                }}>
                    <Textfield
                        style={{
                            display: "block",
                            width: window.innerWidth - this.sendButtonWidth - 20,
                            position: "absolute",
                            bottom: 0,
                            left: 5
                        }}
                        onChange={ev => this.setState({ msgToSend: ev.target.value })}
                        label=""
                        value={this.state.msgToSend}
                    />
                    <Button raised colored onClick={() => this.sendMessage()} style={{
                        width: this.sendButtonWidth,
                        position: "absolute",
                        display: "block",
                        right: 5,
                        bottom: 20
                    }}>发送</Button>
                </div>
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
