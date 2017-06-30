import requests
import json
import time
import threading

ONEIDENTITY_PREFIX = "https://oneidentity.me"

class DomainController:
    def __init__(self, token):
        self.token = token
    
    def on_join(self, user_id, form):
        return {
            "ok": False
        }
    
    def on_quit(self, user_id):
        return {
            "ok": False
        }
    
    def add_user(self, user_id):
        resp = requests.post(ONEIDENTITY_PREFIX + "/services/api/domain/add_user", data = {
            "token": self.token,
            "userId": user_id
        }).json()
        return resp
    
    def remove_user(self, user_id):
        resp = requests.post(ONEIDENTITY_PREFIX + "/services/api/domain/remove_user", data = {
            "token": self.token,
            "userId": user_id
        }).json()
        return resp
    
    def get_user_basic_info(self, user_id):
        resp = requests.post(ONEIDENTITY_PREFIX + "/public/user/get_basic_info_by_id", data = {
            "userId": user_id
        }).json()
        if resp["err"] != 0:
            raise Exception(resp["msg"])
        return resp["info"]
    
    def poll_once(self):
        try:
            print("[oneidentity_dc] Polling...")
            resp = requests.post(ONEIDENTITY_PREFIX + "/services/api/domain/controller/poll", data = {
                "token": self.token
            }).json()

            raw_data = resp["update"]
            if raw_data == None:
                return
            
            req_id = raw_data["id"]
            data = raw_data["data"]
            
            result = {}

            try:
                if data["action"] == "join":
                    result = self.on_join(data["userId"], data.get("form", None))
                elif data["action"] == "quit":
                    result = self.on_quit(data["userId"])
                else:
                    result = {
                        "ok": False,
                        "msg": "Action not implemented"
                    }
            except:
                result = {
                    "ok": False,
                    "msg": "Exception caught during request handling"
                }
            
            requests.post(ONEIDENTITY_PREFIX + "/services/api/domain/controller/send_response", data = {
                "token": self.token,
                "data": json.dumps({
                    "id": req_id,
                    "data": result
                })
            })

            return self.poll_once()
        except:
            print("[oneidentity_dc] Exception caught during polling")
            time.sleep(3)
            return self.poll_once()
    
    def run(self):
        while True:
            t = threading.Thread(target = self.poll_once)
            t.daemon = True
            t.start()
            time.sleep(20)
