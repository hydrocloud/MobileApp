import React from "react";
import ReactDOM from "react-dom";

import * as view from "./view.js";

import Main from "./Main.js";
import Me from "./Me.js";
import Welcome from "./Welcome.js";

async function init() {
    ReactDOM.render((<Main />), document.getElementById("container"))
    if(window.user_info && window.user_info.id) {
        return view.dispatch(Me);
    }
    return view.dispatch(Welcome);
}

init();
