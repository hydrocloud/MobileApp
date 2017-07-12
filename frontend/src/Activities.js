import React from "react";
import ReactDOM from "react-dom";

import ArticleList from "./ArticleList.js";
import JoinUs from "./JoinUs.js";
import EventHub from "./EventHub.js";

export default class Activities extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        EventHub.getDefault().fireEvent("set_title", "动态");
    }

    render() {
        return (
            <div>
                <JoinUs />
                <ArticleList />
            </div>
        );
    }
}
