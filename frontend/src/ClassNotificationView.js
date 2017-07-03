const assert = require("assert");

import React from "react";
import ReactDOM from "react-dom";
import { Card, Button, Textfield, ProgressBar, DataTable, TableHeader } from "react-mdl";

import * as view from "./view.js";
import * as utils from "./utils.js";
import Me from "./Me.js";
import ClassNotifications from "./ClassNotifications.js";
import AddClassNotification from "./AddClassNotification.js";

export default class ClassNotificationView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <div>
                <ClassNotifications extended />
                <AddClassNotification />
                <Button colored onClick={() => view.dispatch(Me)}>返回</Button>
            </div>
        );
    }
}
