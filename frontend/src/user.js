import * as network from "./network.js";

export let info = {
    load(r) {
        this.loggedIn = true;
        this.name = r.name;
        this.schoolName = r.school_name;
        this.className = r.class_name;
    },
    reset() {
        this.loggedIn = false;
        this.name = null;
        this.schoolName = null;
        this.className = null;
    },
    async update() {
        let r = await network.makeRequest("POST", "/api/student/info");
        r = JSON.parse(r);

        if(r.err !== 0) {
            this.reset();
        } else {
            this.load(r);
        }
    }
};

info.loggedIn = false;
