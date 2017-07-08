import React from "react";
import ReactDOM from "react-dom";

import ManualVerificationManagement from "./ManualVerificationManagement.js";
import GlobalPushManagement from "./GlobalPushManagement.js";
import AddArticle from "./AddArticle.js";

export default class Admin extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <ManualVerificationManagement />
                <GlobalPushManagement />
                <AddArticle />
            </div>
        );
    }
}
