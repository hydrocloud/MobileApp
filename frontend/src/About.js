const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar } from "react-mdl";

const config = require("./config.js");

export default class About extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    componentDidMount() {
    }
    
    render() {
        return (
            <Card shadow={0} className="main-card">
                <h3>关于</h3>
                <div style={{textAlign: "left"}}>
                    <p>通中云平台移动端应用</p>
                    <p>版本 {config.VERSION_STR}</p>
                    <p>&copy; 2017 hydrocloud.net.</p>
                    <p>Licensed under GPL v3</p>
                    <p><a href="https://github.com/hydrocloud/MobileApp">GitHub</a></p>
                </div>
            </Card>
        );
    }
}
