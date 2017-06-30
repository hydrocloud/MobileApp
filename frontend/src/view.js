let mainComponent = null;

export function registerMain(obj) {
    mainComponent = obj;
}

export function dispatch(TargetComponent) {
    mainComponent.onDispatch(TargetComponent);
}
