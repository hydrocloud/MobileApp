const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
const network = require("./network.js");
const user = require("./user.js");

export default class Greetings extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            content: "",
            hidden: false
        };
    }

    getContent() {
        let d = new Date();
        let hh = d.getHours();
        let mm = d.getMinutes();
        
        let msg1 = "";
        let msg2 = "";
        let msg3 = "";

        if(hh < 5 || hh > 22) {
            msg1 += "深夜好。";
        } else if(hh < 8) {
            msg1 += "早上好。";
        } else if(hh < 11 || (hh < 12 && mm < 30)) {
            msg1 += "上午好。";
        } else if(hh < 13) {
            msg1 += "中午好。";
        } else if(hh < 18) {
            msg1 += "下午好。";
            msg2 += "午后阳光明媚，何不在通中的校园里走一走。";
        } else {
            msg1 += "晚上好。";
        }

        return (
            <span>{msg1}<br />{msg2}<br />{msg3}</span>
        );
    }

    componentDidMount() {
        this.setState({
            content: (
                <p style={{
                    color: "rgb(233, 30, 99)",
                    fontSize: "22px",
                    lineHeight: "36px"
                }}>{this.getContent()}</p>
            )
        });
        setTimeout(() => this.setState({
            hidden: true
        }), 5000);
    }

    render() {
        return (
            <Card shadow={0} className="main-card" style={{
                transition: "opacity 0.5s linear, margin-bottom 0.5s ease",
                //visibility: this.state.hidden ? "hidden" : "visible",
                opacity: this.state.hidden ? 0 : 1,
                paddingTop: "30px",
                marginBottom: this.state.hidden ? "-200px" : undefined
            }}>
                <div style={{
                    fontSize: "22px"
                }}>{this.state.content}</div>
            </Card>
        )
    }
}
