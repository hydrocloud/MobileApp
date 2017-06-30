const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
const network = require("./network.js");
const user = require("./user.js");

export default class GlobalNotification extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            content: ""
        };
    }

    async componentDidMount() {
        let r = await network.makeRequest("POST", "/api/global/notification");
        r = JSON.parse(r);

        if(r.err !== 0 || !r.content) {
            this.setState({
                content: "无"
            });
            return;
        }

        this.setState({
            content: r.content
        });
    }

    render() {
        return (
            <Card shadow={0} className="main-card">
                <h3>公告</h3>
                <div style={{fontSize: "14px", lineHeight: "22px", wordWrap: "break-word"}}>{this.state.content}</div>
            </Card>
        )
    }
}
