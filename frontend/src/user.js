import * as network from "./network.js";
import EventHub from "./EventHub.js";

export let info = {
    load(r, verified = true) {
        this.loggedIn = true;
        this.verified = verified;
        this.userId = r.user_id;
        this.username = r.username;
        this.name = r.name;
        this.isAdmin = r.is_admin;
        this.schoolName = r.school_name;
        this.className = r.class_name;
        EventHub.getDefault().fireEvent("user_info_update");
    },
    reset() {
        this.loggedIn = false;
        this.verified = false;
        this.userId = null;
        this.username = null;
        this.name = null;
        this.isAdmin = false;
        this.schoolName = null;
        this.className = null;
        EventHub.getDefault().fireEvent("user_info_update");
    },
    async update() {
        let r = await network.makeRequest("POST", "/api/student/info");
        r = JSON.parse(r);

        if(r.err !== 0 && r.err !== 2) { // 2 => Not verified but logged in
            this.reset();
        } else {
            if(r.err === 2) {
                this.load(r, false);
            } else {
                this.load(r, true);
            }
        }
    }
};

info.loggedIn = false;

EventHub.getDefault().waitForEvent("login_complete").then(() => {
    info.update();
});
