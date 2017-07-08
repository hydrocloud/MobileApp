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

export default class ManualVerificationManagement extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            targetUsername: "",
            realName: "",
            schoolName: "江苏省南通中学",
            className: "",
            studentId: "",
            confirming: false
        };
    }

    async confirm() {
        this.setState({
            confirming: true
        });

        let r = await network.makeRequest("POST", "/api/admin/user/verify", {
            target: this.state.targetUsername,
            real_name: this.state.realName,
            school_name: this.state.schoolName,
            class_name: this.state.className,
            student_id: this.state.studentId
        });

        this.setState({
            confirming: false
        });
        
        r = JSON.parse(r);
        if(r.err !== 0) {
            alert(r.msg);
            return;
        }

        alert("用户验证成功。");
        this.setState({
            targetUsername: "",
            realName: "",
            schoolName: "江苏省南通中学",
            className: "",
            studentId: ""
        });
    }

    render() {
        return (
            <Card shadow={0} className="main-card">
                <h3>用户验证</h3>
                <form action="javascript:;" style={{display: this.state.confirming ? "none" : "block"}}>
                    <Textfield
                        label="用户名"
                        floatingLabel
                        onChange={ev => this.setState({targetUsername: ev.target.value})}
                        value={this.state.targetUsername}
                        style={{width: '100%'}}
                    /><br />
                    <Textfield
                        label="真实姓名"
                        floatingLabel
                        onChange={ev => this.setState({realName: ev.target.value})}
                        value={this.state.realName}
                        style={{width: '100%'}}
                    /><br />
                    <Textfield
                        label="学校名称"
                        floatingLabel
                        onChange={ev => this.setState({schoolName: ev.target.value})}
                        value={this.state.schoolName}
                        disabled
                        style={{width: '100%'}}
                    /><br />
                    <Textfield
                        label="班级名称"
                        floatingLabel
                        onChange={ev => this.setState({className: ev.target.value})}
                        value={this.state.className}
                        style={{width: '100%'}}
                    /><br />
                    <Textfield
                        label="学生 ID (选填)"
                        floatingLabel
                        onChange={ev => this.setState({studentId: ev.target.value})}
                        value={this.state.studentId}
                        style={{width: '100%'}}
                    /><br />
                    <Button raised colored onClick={() => this.confirm()}>确认</Button>
                </form>
                <ProgressBar indeterminate style={{display: this.state.confirming ? "block" : "none"}} />
            </Card>
        )
    }
}
