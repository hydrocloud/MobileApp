import * as network from "./network.js";
const assert = require("assert");

export let status = null;
let initWaitingCallbacks = [];
let initDone = false;

export async function init() {
    if(initDone) {
        console.log("Warning: qq.init() is called more than once.");
        return;
    }

    status = await network.makeRequest("POST", "/api/user/qq_connect/status");
    status = JSON.parse(status);
    assert(status.err === 0);

    initDone = true;
    for(let cb of initWaitingCallbacks) cb();
    initWaitingCallbacks = [];
}

export async function update() {
    let newStatus = await network.makeRequest("POST", "/api/user/qq_connect/status");
    newStatus = JSON.parse(newStatus);
    assert(newStatus.err === 0);
    status = newStatus;
}

export function waitForInit() {
    return new Promise(cb => {
        if(initDone) cb();
        else initWaitingCallbacks.push(cb);
    });
}
