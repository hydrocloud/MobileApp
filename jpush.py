import requests
import base64
import json

app_key = ""
master_secret = ""

def push_global_notification(title, content, extras = {}):
    auth_str = base64.b64encode((app_key + ":" + master_secret).encode()).decode()
    #print(auth_str)

    notification = {
        "android": {
            "alert": content,
            "title": title,
            "extras": extras
        },
        "ios": {
            "alert": content,
            "extras": extras
        }
    }

    req = {
        "platform": "all",
        "audience": "all",
        "notification": notification
    }

    r = requests.post("https://api.jpush.cn/v3/push", json = req, headers = {
        "Authorization": "Basic " + auth_str
    }).json()
    print(r)

    err = r.get("error", None)
    if err != None:
        raise Exception("Push failed: " + json.dumps(err))

