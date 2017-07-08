import EventHub from "./EventHub.js";

let mainComponent = null;

export function registerMain(obj) {
    mainComponent = obj;
}

export function dispatch(TargetComponent) {
    EventHub.getDefault().fireEvent("view_dispatch", {
        target: TargetComponent
    });
}
