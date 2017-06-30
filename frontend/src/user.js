export function loadInfoIntoGlobal(info) {
    if(info.err !== 0) {
        throw new Error("Unable to get user info");
    }
    window.user_info = {
        id: info.user_id,
        name: info.username,
        verified: info.verified,
        role: info.role
    };
}
