export function getRelativeTime(t) {
    let c = Date.now();
    let dt = c - t;

    let dtDays = Math.floor(dt / 86400000);
    if(dtDays == 0) {
        return "今天";
    } else {
        return "" + dtDays + " 天前";
    }
}
