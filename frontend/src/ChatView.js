const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import * as utils from "./utils.js";
import Me from "./Me.js";
import ClassNotificationView from "./ClassNotificationView.js";
import ReactMarkdown from "react-markdown";
import Chat from "./Chat.js";
const toMarkdown = require("to-markdown");
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

export default class ChatView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return (
            <Card shadow={0} className="main-card">
                <Chat /><br />
                <Button colored onClick={() => view.dispatch(Me)}>返回</Button>
            </Card>
        )
    }
}
