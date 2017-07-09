import * as network from "./network.js";

export async function log(type, details) {
    try {
        await network.makeRequest("POST", "/api/logging/add", {
            type: type,
            details: JSON.stringify(details)
        });
    } catch(e) {} // prevent loops
}

let listeningGlobalError = false;
let consoleLog = null;
let consoleOutputs = [];

export function logUncaughtExceptions() {
    if(listeningGlobalError) return;
    listeningGlobalError = true;
    window.addEventListener("error", ev => log("error", ev.error));
}

export function logConsoleOutputs() {
    if(consoleLog) return;

    consoleLog = console.log;

    console.log = v => {
        consoleOutputs.push(v);
        consoleLog.apply(console, [v]);
    }
}

export function sendConsoleOutputs() {
    log("console", consoleOutputs);
}
