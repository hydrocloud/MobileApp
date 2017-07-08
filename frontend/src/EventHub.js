const uuid = require("uuid");

export default class EventHub {
    constructor() {
        this.listeners = {};
    }

    fireEvent(ev, params) {
        console.log("Firing event: " + ev);
        if(!this.listeners[ev]) {
            return 0;
        }

        let dispatchCount = 0;

        for(let k in this.listeners[ev]) {
            let t = this.listeners[ev][k];
            t(ev, params);
            dispatchCount++;
        }

        return dispatchCount;
    }

    waitForEvent(name) {
        return new Promise(cb => {
            if(!this.listeners[name]) this.listeners[name] = {};
            let id = uuid.v4();

            this.listeners[name][id] = (ev, params) => {
                delete this.listeners[name][id];
                cb(params);
            };
        });
    }

    static getDefault() {
        return defaultEventHub;
    }
}

let defaultEventHub = new EventHub();
