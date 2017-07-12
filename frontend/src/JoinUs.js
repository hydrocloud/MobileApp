const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import TextCanvas from "./TextCanvas.js";
import EventHub from "./EventHub.js";
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

export default class JoinUs extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            intro: "",
            altContact: "",
            sendingRequest: false,
            myJoinRequest: {},
            showForm: true
        };
    }

    componentDidMount() {
        this.updateMyJoinRequest();
    }

    async sendRequest() {
        if(!this.state.intro) {
            EventHub.getDefault().fireEvent("notification", {
                content: "请填写个人简介"
            });
            return;
        }

        this.setState({
            sendingRequest: true
        });
        let r = await network.makeRequest("POST", "/api/join/request", {
            intro: this.state.intro,
            alt_contact: this.state.altContact
        });
        r = JSON.parse(r);
        this.setState({
            sendingRequest: false
        });

        if(r.err !== 0) {
            console.log(r);
            EventHub.getDefault().fireEvent("notification", {
                content: "出错: " + r.msg
            });
            return;
        }

        this.setState({
            intro: "",
            altContact: ""
        });
        this.updateMyJoinRequest();
    }

    async updateMyJoinRequest() {
        let r = await network.makeRequest("POST", "/api/join/my_request");
        r = JSON.parse(r);
        if(r.err !== 0) {
            return;
        }
        this.setState({
            myJoinRequest: {
                id: r.id,
                intro: r.intro,
                altContact: r.alt_contact,
                response: r.response,
                time: r.create_time
            },
            intro: r.intro,
            altContact: r.alt_contact,
            showForm: false
        });
    }

    render() {
        return (
            <div>
                <Card shadow={0} className="main-card">
                    <h3>加入我们</h3>
                    <div style={{display: this.state.showForm ? "block" : "none"}}>
                        <Textfield
                            onChange={ev => this.setState({ intro: ev.target.value })}
                            label="个人简介"
                            floatingLabel
                            rows={7}
                            style={{width: "100%"}}
                            value={this.state.intro}
                        /><br />
                        <Textfield
                            onChange={ev => this.setState({ altContact: ev.target.value })}
                            label="备用联系方式"
                            floatingLabel
                            style={{width: "100%"}}
                            value={this.state.altContact}
                        /><br />
                        <Button raised colored disabled={this.state.sendingRequest} onClick={() => this.sendRequest()}>提交</Button>
                    </div>
                    <div style={{display: this.state.showForm ? "none" : "block"}}>
                        <h5>个人简介</h5>
                        <pre>{this.state.myJoinRequest.intro}</pre>
                        <h5>备用联系方式</h5>
                        <p>{this.state.myJoinRequest.altContact}</p>
                        <h5>团队回复</h5>
                        <pre>{this.state.myJoinRequest.response || "暂无"}</pre>
                        <p style={{color: "#7F7F7F"}}>你可以随时<a onClick={() => this.setState({ showForm: true })}>重新提交申请</a>。我们将通过 App 内私信或你提供的备用联系方式与你取得联系。</p>
                    </div>
                </Card>
            </div>
        )
    }
}
