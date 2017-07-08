import * as network from "./network.js";
import * as utils from "./utils.js";
import * as view from "./view.js";
import Article from "./Article.js";
import Chat from "./Chat.js";
import ChatView from "./ChatView.js";

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

    document.addEventListener("jpush.receiveNotification", handleRecvNotification);
    if(Object.keys(window.plugins.jPushPlugin.receiveNotification).length > 0) {
        let ev = window.plugins.jPushPlugin.receiveNotification;
        window.plugins.jPushPlugin.receiveNotification = {};
        handleRecvNotification(ev);
    }
}

function handleOpenNotification(ev) {
    let notificationType = ev.extras.type;
    if(notificationType == "global") {
        handleGlobalNotification(ev.extras.id, false);
    } else if(notificationType == "user") {
        handleUserNotifcation(ev.extras.id, false);
    }
}

function handleRecvNotification(ev) {
    let notificationType = ev.extras.type;
    if(notificationType == "global") {
        handleGlobalNotification(ev.extras.id, true);
    } else if(notificationType == "user") {
        handleUserNotifcation(ev.extras.id, true);
    }
}

async function handleGlobalNotification(id, isRecv = false) {
    if(isRecv) return;

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

    await utils.sleep(500);

    Article.preload(article);
    view.dispatch(Article);
}

async function handleUserNotifcation(id, isRecv = false) {
    let details = JSON.parse(await network.makeRequest("POST", "/api/device/user_notification/details", {
        notification_id: id
    }));
    if(details.err !== 0) {
        console.log(details);
        return;
    }
    details = details.details;
    console.log(details);

    if(details.subtype == "pm") {
        handlePMRecv(details.pm_id, isRecv);
    } else if(!details.subtype) {
    } else {
        if(!isRecv) {
            alert("未知的消息类型: " + details.subtype + " 。请尝试更新 App 到最新版本。");
        }
    }
}

async function handlePMRecv(id, isRecv) {
    let pm = JSON.parse(await network.makeRequest("POST", "/api/pm/details", {
        pm_id: id
    }));
    if(pm.err !== 0) {
        console.log(pm);
        return;
    }
    pm = pm.pm;

    if(!Chat.onRecv(pm)) {
        if(isRecv) return;

        Chat.preload({
            to: pm.from
        });
        view.dispatch(ChatView);
    }
}
