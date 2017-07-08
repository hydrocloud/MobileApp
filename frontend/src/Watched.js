import React from "react";
import ReactDOM from "react-dom";

const qq = require("./qq.js");
import WatchedQQGroupMessages from "./WatchedQQGroupMessages.js";
import EmptyNotice from "./EmptyNotice.js";

export default class MyClass extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            qqWidgets: ""
        };
    }

    async loadQQWidgets() {
        await qq.waitForInit();

        if(!qq.status.connected) {
            this.setState({
                qqWidgets: ""
            });
            return;
        }

        this.setState({
            qqWidgets: (
                <div>
                    <WatchedQQGroupMessages />
                </div>
            )
        });
    }

    componentDidMount() {
        this.loadQQWidgets();
    }

    render() {
        let noWatchedNotice = "";

        if(!this.state.qqWidgets) {
            noWatchedNotice = (
                <EmptyNotice text="暂无关注的内容" />
            );
        }

        return (
            <div>
                {noWatchedNotice}
                {this.state.qqWidgets}
            </div>
        );
    }
}
