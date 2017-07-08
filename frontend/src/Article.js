const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import Verify from "./Verify.js";
import * as utils from "./utils.js";
import ClassNotificationView from "./ClassNotificationView.js";
import ReactMarkdown from "react-markdown";
const toMarkdown = require("to-markdown");
const network = require("./network.js");
const user = require("./user.js");
const qq = require("./qq.js");

let preloaded = null;

export default class Article extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: "",
            title: "",
            author: "",
            content: ""
        };
    }

    componentDidMount() {
        this.setState({
            id: this.props.id || preloaded.id,
            title: this.props.title || preloaded.title,
            author: this.props.author || preloaded.author,
            content: this.props.content || preloaded.content
        });
        preloaded = null;
    }
    
    render() {
        return (
            <Card shadow={0} className="main-card">
                <h5 style={{fontSize: "20px", lineHeight: "32px"}}>{this.state.title}</h5>
                <p style={{color: "#7F7F7F"}}>{this.state.author}</p>
                <ReactMarkdown source={toMarkdown(this.state.content)} />
                <p style={{color: "#7F7F7F"}}>文章 ID: <span style={{userSelect: "auto"}}>{this.state.id}</span></p>
            </Card>
        )
    }

    static preload(data) {
        preloaded = data;
    }
}
