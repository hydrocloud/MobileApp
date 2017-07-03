const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import Welcome from "./Welcome.js";
import MyInfo from "./MyInfo.js";
import GlobalNotification from "./GlobalNotification.js";
import MyExams from "./MyExams.js";
import Greetings from "./Greetings.js";
import QQConnection from "./QQConnection.js";
import WatchedQQGroupMessages from "./WatchedQQGroupMessages.js";
import ClassNotifications from "./ClassNotifications.js";
import AddClassNotification from "./AddClassNotification.js";
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

export default class Me extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            qqWidgets: ""
        };
    }

    async componentDidMount() {
        await user.info.update();
        if(!user.info.loggedIn) {
            view.dispatch(Welcome);
            return;
        }
        if(!user.info.verified) {
            view.dispatch(Verify);
            return;
        }
        qq.init();
        this.loadQQWidgets();
    }

    async loadQQWidgets() {
        await qq.waitForInit();

        if(!qq.status.connected) {
            this.setState({
                qqWidgets: ""
            });
            return;
        }

        this.setState({
            qqWidgets: (
                <div>
                    <WatchedQQGroupMessages />
                </div>
            )
        });
    }

    render() {
        return (
            <div>
                <Greetings />
                <MyInfo />
                <GlobalNotification />
                <QQConnection />
                {this.state.qqWidgets}
                <ClassNotifications />
                <MyExams />
            </div>
        )
    }
}
