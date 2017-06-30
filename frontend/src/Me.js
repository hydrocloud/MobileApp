const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar } from "react-mdl";

import * as view from "./view.js";
const network = require("./network.js");

export default class Me extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            doingZhixueLogin: false,
            student: {
                name: "",
                school_name: "",
                class_name: ""
            }
        }
    }

    async requestZhixueVerification() {
        this.setState({
            doingZhixueLogin: true
        });

        const username = document.getElementById("zhixue-username").value;
        const pw = document.getElementById("zhixue-password").value;

        let r = {err: -1};
        try {
            r = JSON.parse(await network.makeRequest("POST", "/api/user/verify/zhixue", {
                username: username,
                password: pw
            }));
            assert(r.err === 0);
            window.user_info.status = 1;
            this.checkUserStatus();
            this.forceUpdate();
        } catch(e) {
            alert("验证失败。");
        }
        this.setState({
            doingZhixueLogin: false
        });
    }

    async removeStudent() {
        try {
            let r = JSON.parse(await network.makeRequest("POST", "/api/student/remove"));
            assert(r.err === 0);
            window.user_info.verified = false;
            this.checkUserStatus();
            this.forceUpdate();
        } catch(e) {
            alert("解除关联失败。");
        }
    }

    async getStudentInfo() {
        try {
            let r = JSON.parse(await network.makeRequest("POST", "/api/student/info"));
            assert(r.err === 0);
            this.setState({
                student: {
                    name: r.name,
                    school_name: r.school_name,
                    class_name: r.class_name
                }
            });
        } catch(e) {
            alert("学生信息获取失败。");
        }
    }

    checkUserStatus() {
        switch(window.user_info.verified) {
            case false:
                break;
            case true:
                this.getStudentInfo();
                break;
        }
    }

    componentDidMount() {
        this.checkUserStatus();
    }
    
    render() {
        let body = "";
        switch(window.user_info.role) {
            case "student":
                body = (
                    <Card shadow={0} className="main-card">
                        <h3>学生信息</h3>
                        <div style={{textAlign: "left"}}>
                            <p>姓名: {this.state.student.name}</p>
                            <p>学校: {this.state.student.school_name}</p>
                            <p>班级: {this.state.student.class_name}</p>
                            <Button accent onClick={() => this.removeStudent()}>解除关联</Button>
                        </div>
                    </Card>
                );
                break;
            default:
                body = (
                    <Card shadow={0} className="main-card">
                        <h3>身份验证</h3>
                        <div style={{textAlign: "left"}}>
                            <p>欢迎, {window.user_info.name}。</p>
                            <p>我们需要验证你的智学网账号来确认身份。</p>
                        </div>
                        <form action="javascript:;" style={{display: this.state.doingZhixueLogin ? "none" : "block"}}>
                            <Textfield
                                id="zhixue-username"
                                label="用户名"
                                floatingLabel
                                style={{width: '100%'}}
                            /><br />
                            <Textfield
                                id="zhixue-password"
                                type="password"
                                label="密码"
                                floatingLabel
                                style={{width: '100%'}}
                            /><br />
                            <Button raised colored onClick={() => this.requestZhixueVerification()}>确认</Button>
                        </form>
                        <div style={{display: this.state.doingZhixueLogin ? "block" : "none"}}>
                            <ProgressBar indeterminate />
                        </div>
                    </Card>
                );
                break;
        }
        return (
            <div>
                {body}
            </div>
        )
    }
}
