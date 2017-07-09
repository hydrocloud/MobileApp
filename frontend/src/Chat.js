const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader, Icon } from "react-mdl";
import { ChatFeed, Message } from "react-chat-ui";

import * as view from "./view.js";
import Verify from "./Verify.js";
import * as utils from "./utils.js";
import ClassNotificationView from "./ClassNotificationView.js";
import ReactMarkdown from "react-markdown";
import ChatList from "./ChatList.js";
import EventHub from "./EventHub.js";

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
            msgToSend: "",
            viewResizeTime: 0
        };
        this.headerHeight = 50;
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
            EventHub.getDefault().fireEvent("notification", {
                content: "请输入消息内容"
            });
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

    async handleViewResize() {
        while(true) {
            try {
                await EventHub.getDefault().waitForEvent("view_resize");
                this.setState({
                    viewResizeTime: Date.now()
                });
            } catch(e) {
                console.log(e);
            }
        }
    }

    componentDidMount() {
        this.setState({
            to: this.props.to || preloaded.to
        }, () => {
            if(this.state.to) updateListeners[this.state.to] = msg => this.addMessage(msg);
            this.updateConversation();
        });
        EventHub.getDefault().fireEvent("hide_header");
        this.handleViewResize();

        preloaded = null;
    }

    componentWillUnmount() {
        if(updateListeners[this.state.to]) delete updateListeners[this.state.to];
    }
    
    render() {
        let m = {};
        let viewMessages = this.state.messages.sort((a, b) => a.time - b.time).filter(v => {
            if(m[v.id]) return false;
            else {
                m[v.id] = true;
                return true;
            }
        }).map(v => new Message({
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
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    width: "100%",
                    height: this.headerHeight,
                    backgroundColor: "#FFFFFF",
                    color: "#333333",
                    boxShadow: "0 0 10px rgba(127, 127, 127, 0.3)"
                }}>
                    <div style={{
                        position: "absolute",
                        top: 0,
                        left: 10,
                        bottom: 0,
                        lineHeight: "" + this.headerHeight + "px",
                        height: this.headerHeight,
                        paddingTop: 6
                    }} onClick={() => view.dispatch(ChatList)}><Icon name="arrow_back" /></div>
                    <div style={{
                        position: "absolute",
                        top: 0,
                        left: 50,
                        bottom: 0,
                        lineHeight: "" + this.headerHeight + "px",
                        height: this.headerHeight,
                        fontSize: 18
                    }}>{this.state.toRealName}</div>
                </div>
                <div style={{
                    position: "absolute",
                    bottom: this.inputHeight + 5,
                    left: "0px",
                    right: "0px",
                    width: "100%",
                    height: window.innerHeight - this.inputHeight - this.headerHeight - 5
                }}>
                    <div style={{
                        position: "absolute",
                        bottom: 0,
                        width: window.innerWidth - 10,
                        height: "100%",
                        paddingLeft: 5,
                        paddingRight: 5
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
                    <Button colored onClick={() => this.sendMessage()} style={{
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
