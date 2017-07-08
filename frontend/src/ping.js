import EventHub from "./EventHub.js";
import * as network from "./network.js";

export function start() {
    setInterval(async () => {
        let r = await network.makeRequest("POST", "/api/ping");
        r = JSON.parse(r);
        if(r.err !== 0) throw r;

        EventHub.getDefault().fireEvent("network_ok");
    }, 5000);
    checkNetworkError();
}

async function checkNetworkError() {
    while(true) {
        try {
            let timeoutId = setTimeout(() => EventHub.getDefault().fireEvent("network_error"), 12000);
            await EventHub.getDefault().waitForEvent("network_ok");
            clearTimeout(timeoutId);
        } catch(e) {
            console.log(e);
        }
    }
}
