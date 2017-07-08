const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar } from "react-mdl";

import * as view from "./view.js";
import Me from "./Me.js";
import Welcome from "./Welcome.js";
import Verify from "./Verify.js";
import EventHub from "./EventHub.js";
const network = require("./network.js");
const user = require("./user.js");

function clearCookies() {
    document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
}

export default class MyInfo extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            doingZhixueLogin: false,
            user: {
                loggedIn: false
            }
        }
    }

    syncUserInfo() {
        this.setState({
            user: {
                loggedIn: user.info.loggedIn,
                name: user.info.name,
                schoolName: user.info.schoolName,
                className: user.info.className
            }
        });
    }

    async removeStudent() {
        if(!confirm("你正在撤销当前账号的学生认证。请再次确认。")) {
            return;
        }

        try {
            let r = JSON.parse(await network.makeRequest("POST", "/api/student/remove"));
            assert(r.err === 0);
            this.logout();
        } catch(e) {
            console.log(e);
            alert("解除关联失败。");
        }
    }

    async getStudentInfo() {
        try {
            this.syncUserInfo();
        } catch(e) {
            console.log(user.info);
            console.log(this.state);
        }
    }

    async handleUserInfoUpdate() {
        while(true) {
            try {
                await EventHub.getDefault().waitForEvent("user_info_update");
                this.getStudentInfo();
            } catch(e) {
                console.log(e);
            }
        }
    }

    componentDidMount() {
        this.getStudentInfo();
        this.handleUserInfoUpdate();
    }

    async logout() {
        clearCookies();
        delete localStorage.persistentToken;

        user.info.reset();
        view.dispatch(Welcome);
    }
    
    render() {
        try {
            return (
                <Card shadow={0} className="main-card">
                    <h3>学生信息</h3>
                    <div style={{textAlign: "left"}}>
                        <p>姓名: {this.state.user.name}</p>
                        <p>学校: {this.state.user.schoolName}</p>
                        <p>班级: {this.state.user.className}</p>
                        <Button colored onClick={() => this.logout()}>登出</Button><br />
                        <Button colored onClick={() => view.dispatch(Verify)}>更改认证方式</Button><br />
                        <Button accent onClick={() => this.removeStudent()}>撤销学生认证并登出</Button><br />
                    </div>
                </Card>
            );
        } catch(e) {
            console.log(e);
        }
    }
}
