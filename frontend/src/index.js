import React from "react";
import ReactDOM from "react-dom";

import * as view from "./view.js";

import Main from "./Main.js";
import Welcome from "./Welcome.js";

const ping = require("./ping.js");

async function init() {
    override_link_open();
    ping.start();

    ReactDOM.render((<Main />), document.getElementById("container"))
    return view.dispatch(Welcome);
}

function override_link_open() {
    document.onclick = e => {
        e = e ||  window.event;
        let element = e.target || e.srcElement;

        if (element.tagName == 'A' && element.href) {
            window.open(element.href, "_blank", "location=yes");
            return false;
        }

        return true;
    };
}

if(window.cordova) {
    document.addEventListener("deviceready", init);
} else {
    init();
}
