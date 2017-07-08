import React from "react";
import ReactDOM from "react-dom";

import ArticleList from "./ArticleList.js";

export default class Activities extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <ArticleList />
            </div>
        );
    }
}
