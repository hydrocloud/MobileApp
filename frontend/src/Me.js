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
const network = require("./network.js");
const user = require("./user.js");

export default class Me extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
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
    }

    render() {
        return (
            <div>
                <Greetings />
                <MyInfo />
                <GlobalNotification />
                <MyExams />
            </div>
        )
    }
}
