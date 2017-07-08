const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar } from "react-mdl";

import * as view from "./view.js";
import Settings from "./Settings.js";
import Welcome from "./Welcome.js";
import Verify from "./Verify.js";
import EventHub from "./EventHub.js";
const network = require("./network.js");
const user = require("./user.js");

export default class SidebarUserInfo extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
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
    
    render() {
        try {
            return (
                <div onClick={() => view.dispatch(Settings)} style={{width: "100%", paddingLeft: "20px"}}>
                    <h5>{this.state.user.name}</h5>
                    <span style={{fontSize: "14px", color: "#7F7F7F"}}>{this.state.user.className}</span>
                </div>
            );
        } catch(e) {
            console.log(e);
        }
    }
}
