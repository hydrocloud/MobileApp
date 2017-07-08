import React from "react";
import ReactDOM from "react-dom";

import ClassNotificationView from "./ClassNotificationView.js";

export default class MyClass extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <ClassNotificationView />
        );
    }
}
