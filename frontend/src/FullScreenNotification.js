import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, ProgressBar } from "react-mdl";

import * as view from "./view.js";
const network = require("./network.js");
const user = require("./user.js");
const config = require("./config.js");
import EventHub from "./EventHub.js";

export default class FullScreenNotification extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <div style={{
                position: "fixed",
                top: "0px",
                left: "0px",
                width: "100%",
                height: "100%",
                zIndex: "11",
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                textAlign: "center",
            }}>
                <div style={{
                    position: "absolute",
                    top: "0px",
                    left: "0px",
                    bottom: "0px",
                    right: "0px",
                    margin: "auto",
                    width: "180px",
                    height: "36px",
                    fontSize: "24px",
                    lineHeight: "36px"
                }}>
                    <div style={{
                        marginBottom: "28px"
                    }}>{this.props.text}</div>
                    <Button raised colored onClick={() => this.props.onClose()}>关闭</Button>
                </div>
            </div>
        );
    }
}
