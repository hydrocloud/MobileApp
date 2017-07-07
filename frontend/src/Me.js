const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar } from "react-mdl";

import * as view from "./view.js";
import * as push from "./push.js";
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
import ManualVerificationManagement from "./ManualVerificationManagement.js";
import GlobalPushManagement from "./GlobalPushManagement.js";
import AddArticle from "./AddArticle.js";
import ArticleList from "./ArticleList.js";
import ChatList from "./ChatList.js";
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

let prepared = false;

export default class Me extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            qqWidgets: "",
            adminWidgets: ""
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
        push.init();
        this.loadQQWidgets();
        this.loadAdminWidgets();
        prepared = true;
    }

    static isPrepared() {
        return prepared;
    }

    loadAdminWidgets() {
        if(user.info.isAdmin) {
            this.setState({
                adminWidgets: (
                    <div>
                        <ManualVerificationManagement />
                        <GlobalPushManagement />
                        <AddArticle />
                    </div>
                )
            });
        } else {
            this.setState({
                adminWidgets: ""
            });
        }
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
                <ArticleList />
                <MyExams />
                <ChatList />
                {this.state.adminWidgets}
            </div>
        )
    }
}
