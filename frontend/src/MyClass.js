import React from "react";
import ReactDOM from "react-dom";

import ClassNotificationView from "./ClassNotificationView.js";
import EventHub from "./EventHub.js";

export default class MyClass extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        EventHub.getDefault().fireEvent("set_title", "班级");
    }

    render() {
        return (
            <ClassNotificationView />
        );
    }
}
