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
            try {
                t(ev, params);
            } catch(e) {
                console.log(e);
            }
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

    listen(name, cb) {
        if(!this.listeners[name]) this.listeners[name] = {};
        let id = uuid.v4();

        this.listeners[name][id] = (ev, params) => cb(params);
        return new ListenHandle(this.listeners[name], id);
    }

    static getDefault() {
        return defaultEventHub;
    }
}

class ListenHandle {
    constructor(ev, id) {
        this.ev = ev;
        this.id = id;
    }

    reset() {
        delete this.ev[this.id];
        this.ev = null;
        this.id = null;
    }
}

let defaultEventHub = new EventHub();
