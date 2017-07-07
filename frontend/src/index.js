import React from "react";
import ReactDOM from "react-dom";

import * as view from "./view.js";

import Main from "./Main.js";
import Me from "./Me.js";
import Welcome from "./Welcome.js";

async function init() {
    override_link_open();
    
    ReactDOM.render((<Main />), document.getElementById("container"))
    if(window.user_info && window.user_info.id) {
        return view.dispatch(Me);
    }
    return view.dispatch(Welcome);
}

function override_link_open() {
    if(!window.cordova) return;

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

init();
