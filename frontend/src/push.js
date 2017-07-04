import * as network from "./network.js";
import * as utils from "./utils.js";
import * as view from "./view.js";
import Article from "./Article.js";
import Me from "./Me.js";

function getRegistrationId() {
    return new Promise(cb => {
        window.plugins.jPushPlugin.getRegistrationID(id => cb(id));
    });
}

async function registerDevice(jpushId) {
    let r = await network.makeRequest("POST", "/api/device/register", {
        jpush_id: jpushId
    });
    r = JSON.parse(r);
    if(r.err !== 0) throw r;

    return r.device_id;
}

export async function init() {
    if(!window.cordova) {
        return;
    }

    let jpushId = "";
    while(!jpushId) {
        jpushId = await getRegistrationId();
        await utils.sleep(100);
    }

    console.log("Push initialized. jPush id: " + jpushId);
    let deviceId = await registerDevice(jpushId);
    console.log("Device registered. Device id: " + deviceId);

    while(!window.document) {
        await utils.sleep(10);
    }

    document.addEventListener("jpush.openNotification", handleOpenNotification);
    if(Object.keys(window.plugins.jPushPlugin.openNotification).length > 0) {
        let ev = window.plugins.jPushPlugin.openNotification;
        window.plugins.jPushPlugin.openNotification = {};
        handleOpenNotification(ev);
    }
}

function handleOpenNotification(ev) {
    let notificationType = ev.extras.type;
    if(notificationType == "global") {
        handleGlobalNotification(ev.extras.id);
    }
}

async function handleGlobalNotification(id) {
    let articleId = JSON.parse(await network.makeRequest("POST", "/api/device/global_notification/article_id", {
        notification_id: id
    })).article_id;

    let article = JSON.parse(await network.makeRequest("POST", "/api/article/get", {
        id: articleId
    }));

    if(article.err !== 0) {
        console.log(article);
        return;
    }

    while(!Me.isPrepared()) {
        await utils.sleep(10);
    }

    Article.preload(article);
    view.dispatch(Article);
}
