import React from "react";
import ReactDOM from "react-dom";

import MyInfo from "./MyInfo.js";
import QQConnection from "./QQConnection.js";

export default class Settings extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <MyInfo />
                <QQConnection />
            </div>
        );
    }
}
