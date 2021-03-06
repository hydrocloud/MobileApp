import sys
import time
import json
import pyice
import threading
import pymongo
import uuid
import zhixue
import random
import jpush
import aiohttp
import asyncio
import motor.motor_asyncio

#gevent.monkey.patch_all()

app = pyice.application.Application(session_cookie = "HMAPP_TOKEN")
cfg = {}
db = pymongo.MongoClient("127.0.0.1", 27017).HydroCloud_MobileApp
db_async = motor.motor_asyncio.AsyncIOMotorClient("127.0.0.1", 27017).HydroCloud_MobileApp
user_notification_queue = []

with open(sys.argv[1], "rb") as f:
    cfg = json.loads(f.read().decode("utf-8"))

jpush.app_key = cfg["jpush_app_key"]
jpush.master_secret = cfg["jpush_master_secret"]

requests = None

async def init_requests():
    global requests
    requests = aiohttp.ClientSession()

asyncio.get_event_loop().run_until_complete(init_requests())

class Session:
    def __init__(self, user_id, username):
        self.user_id = user_id
        self.username = username
    
    @staticmethod
    def get(ctx):
        ctx.request.load_session()
        try:
            return Session(ctx.request.session["user_id"], ctx.request.session["username"])
        except:
            return None
    
    def write(self, ctx):
        ctx.request.load_session()
        ctx.request.session["user_id"] = self.user_id
        ctx.request.session["username"] = self.username
    
    def destroy(self, ctx):
        self.user_id = None
        self.username = None
        self.write(ctx)

class User:
    def __init__(self, id = "", name = "", role = "unknown", real_name = "", student_id = "", school_id = "", school_name = "", class_id = "", class_name = ""):
        self.id = id
        self.name = name

        self.role = role

        self.real_name = real_name
        self.student_id = student_id

        self.school_id = school_id
        self.school_name = school_name

        self.class_id = class_id
        self.class_name = class_name

        self.zhixue_username = ""
        self.zhixue_password = ""

        self.pm_disabled = False

        self.disabled = False
    
    @staticmethod
    def _get(u, with_credentials = False):
        if u == None or u.get("disabled", False) == True:
            return None
        
        ret = User(id = u["id"], name = u["name"], role = u["role"], real_name = u["real_name"], student_id = u["student_id"], school_id = u["school_id"], school_name = u["school_name"], class_id = u["class_id"], class_name = u["class_name"])
        ret.pm_disabled = u.get("pm_disabled", False)

        if with_credentials:
            ret.zhixue_username = u["zhixue_username"]
            ret.zhixue_password = u["zhixue_password"]

        return ret
    
    @staticmethod
    def get_by_id(id, with_credentials = False):
        u = db.users.find_one({
            "id": id
        })
        return User._get(u, with_credentials = with_credentials)
    
    @staticmethod
    async def get_by_id_async(id, with_credentials = False):
        u = await db_async.users.find_one({
            "id": id
        })
        return User._get(u, with_credentials = with_credentials)
    
    @staticmethod
    def get_by_name(name, with_credentials = False):
        u = db.users.find_one({
            "name": name
        })
        return User._get(u, with_credentials = with_credentials)
    
    @staticmethod
    async def get_by_name_async(name, with_credentials = False):
        u = await db_async.users.find_one({
            "name": name
        })
        return User._get(u, with_credentials = with_credentials)
    
    def get_props(self):
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "real_name": self.real_name,
            "student_id": self.student_id,
            "school_id": self.school_id,
            "school_name": self.school_name,
            "class_id": self.class_id,
            "class_name": self.class_name,
            "zhixue_username": self.zhixue_username,
            "zhixue_password": self.zhixue_password,
            "pm_disabled": self.pm_disabled,
            "disabled": self.disabled
        }
    
    def update(self):
        return db.users.update_one({
            "id": self.id
        }, {
            "$set": self.get_props()
        })
    
    def insert(self):
        return db.users.insert_one(self.get_props())
    
    async def update_async(self):
        return await db_async.users.update_one({
            "id": self.id
        }, {
            "$set": self.get_props()
        })
    
    async def insert_async(self):
        return await db_async.users.insert_one(self.get_props())
    
    def update_or_insert(self):
        r = self.update()
        if r.matched_count == 0:
            self.insert()
    
    async def update_or_insert_async(self):
        r = await self.update_async()
        if r.matched_count == 0:
            await self.insert_async()
    
    def remove(self):
        self.disabled = True
        self.update_or_insert()
    
    def is_verified(self):
        if self.real_name != None and self.real_name != "":
            return True
        return False
    
    def is_admin(self):
        for uid in cfg["admin_users"]:
            if self.id == uid:
                return True

        return False
    
    def load_student_info_from_zhixue_login_response(self, username, pw, resp):
        if resp["errorCode"] != 0:
            raise Exception("Login failed")
        r = resp["result"]
        print(r)
        self.real_name = r["name"]
        self.student_id = r["userInfo"]["studentNo"]
        self.school_id = r["userInfo"]["school"]["schoolId"]
        self.school_name = r["userInfo"]["school"]["schoolName"]
        self.class_id = r["clazzInfo"]["id"]
        self.class_name = r["clazzInfo"]["name"]
        self.zhixue_username = username
        self.zhixue_password = pw
        self.role = "student"
    
    def get_zhixue_token(self):
        if type(self.zhixue_username) != str or len(self.zhixue_username) == 0:
            raise Exception("Zhixue account not connected")

        return zhixue.login(self.zhixue_username, self.zhixue_password)["result"]["token"]
    
    def get_zhixue_exams(self):
        token = self.get_zhixue_token()

        current_time = int(time.time() * 1000)

        cached = db.user_exams.find_one({
            "user_id": self.id
        })
        if cached == None or current_time - cached["update_time"] > 3600000: # 1 hour
            print("Fetching exam list for user " + self.id)
            db.user_exams.delete_many({
                "user_id": self.id
            })
            exams = zhixue.get_exam_list(token)
            db.user_exams.insert_one({
                "user_id": self.id,
                "exams": exams,
                "update_time": current_time
            })
        else:
            exams = cached["exams"]
        return exams
    
    def push_notification(self, title, content, details):
        notification_id = str(uuid.uuid4())
        current_time = int(time.time() * 1000)

        db.user_notifications.insert_one({
            "id": notification_id,
            "user_id": self.id,
            "title": title,
            "content": content,
            "details": details,
            "create_time": current_time
        })
        for d in db.devices.find({"user_id": self.id}):
            jpush.push_user_notification(d["jpush_id"], title, content, {
                "type": "user",
                "id": notification_id
            })
    
    def get_notification_details(self, notification_id):
        r = db.user_notifications.find_one({
            "id": notification_id,
            "user_id": self.id
        })
        if r == None:
            return None
        return r["details"]

class UserNotification:
    def __init__(self, u, title, content, details):
        if isinstance(u, User) == False:
            raise Exception("UserNotification requires a user")
        
        self.user = u
        self.title = title
        self.content = content
        self.details = details

class Class:
    def __init__(id = "", name = "", school_id = "", school_name = "", admins = []):
        self.id = id
        self.name = name
        self.school_id = school_id
        self.school_name = school_name
        self.admins = admins
    
    @staticmethod
    def get_by_id(id):
        c = db.classes.find_one({
            "id": id
        })
        if c == None:
            return None
        return Class(
            id = c["id"],
            name = c["name"],
            school_id = c["school_id"],
            school_name = c["school_name"],
            admins = c["admins"]
        )
    
    def update(self):
        return db.classes.update_one({
            "id": self.id
        }, {
            "$set": {
                "name": self.name,
                "school_id": self.school_id,
                "school_name": self.school_name,
                "admins": self.admins
            }
        })
    
    def insert(self):
        return db.classes.insert_one({
            "id": self.id,
            "name": self.name,
            "school_id": self.school_id,
            "school_name": self.school_name,
            "admins": self.admins
        })
    
    def update_or_insert(self):
        r = self.update()
        if r.matched_count == 0:
            self.insert()
        
    def remove(self):
        return db.classes.delete_one({
            "id": self.id
        })

@app.route("/api/user/login", methods = ["POST"])
async def on_api_user_login(ctx):
    client_token = ctx.request.form["client_token"]

    async with requests.post("https://oneidentity.me/identity/verify/verify_client_token", data = { "client_token": client_token }) as resp:
        r = await resp.json()

    if r["err"] != 0:
        return ctx.jsonify({
            "err": 1,
            "msg": "Verification failed"
        })

    u = await User.get_by_id_async(r["userId"])
    if u == None:
        u = User(id = r["userId"], name = r["username"])
        await u.update_or_insert_async()
    
    sess = Session(r["userId"], r["username"])
    sess.write(ctx)

    pt = str(uuid.uuid4())
    await db_async.persistent_tokens.insert_one({
        "token": pt,
        "user_id": sess.user_id,
        "username": sess.username
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "persistent_token": pt
    })

@app.route("/api/user/logout", methods = ["POST"])
def on_api_user_logout(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    sess.destroy(ctx)

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/ping", methods = ["POST"], blocking = True)
def on_api_ping(ctx):
    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/user/auto_login", methods = ["POST"])
def on_api_user_auto_login(ctx):
    pt = ctx.request.form["persistent_token"]
    info = db.persistent_tokens.find_one({
        "token": pt
    })
    if info == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Invalid persistent token"
        })
    
    sess = Session(info["user_id"], info["username"])
    sess.write(ctx)

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/user/info", methods = ["POST"])
def on_api_user_info(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "user_id": sess.user_id,
        "username": sess.username,
        "role": u.role,
        "verified": u.is_verified(),
        "is_admin": u.is_admin()
    })

@app.route("/api/user/verify/zhixue", methods = ["POST"])
def on_api_user_verify_zhixue(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)

    username = ctx.request.form["username"]
    pw = ctx.request.form["password"]
    
    r = zhixue.login(username, pw)
    try:
        u.load_student_info_from_zhixue_login_response(username, pw, r)
    except:
        return ctx.jsonify({
            "err": 2,
            "msg": "Login failed"
        })
    
    u.update_or_insert()

    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "name": u.real_name,
        "school_name": u.school_name,
        "class_name": u.class_name
    })

@app.route("/api/admin/user/verify", methods = ["POST"])
def on_api_admin_user_verify(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    if User.get_by_id(sess.user_id).is_admin() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "Not admin"
        })
    
    t = User.get_by_name(ctx.request.form["target"])
    if t == None:
        return ctx.jsonify({
            "err": 3,
            "msg": "Target user not found"
        })
    
    if t.is_verified():
        return ctx.jsonify({
            "err": 4,
            "msg": "Already verified"
        })
    
    t.real_name = ctx.request.form["real_name"]
    t.school_name = ctx.request.form["school_name"]
    t.class_name = ctx.request.form["class_name"]
    t.role = "student"

    student_id = ctx.request.form.get("student_id", None)
    if student_id != None and len(student_id) > 0:
        t.student_id = student_id
    
    t.update()
    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/admin/join_review/list", methods = ["POST"])
def on_api_admin_join_review_list(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    if User.get_by_id(sess.user_id).is_admin() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "Not admin"
        })
    
    limit = int(ctx.request.form.get("limit", "1000"))
    
    reqs = []
    for req in db.join_requests.find({}).sort("create_time", -1).limit(limit):
        u = User.get_by_id(req["user_id"])

        has_response = True

        if req["response"] == None or req["response"] == "":
            has_response = False

        reqs.append({
            "id": req["id"],
            "user_id": u.id,
            "username": u.name,
            "name": u.real_name,
            "has_response": has_response,
            "create_time": req["create_time"]
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "requests": reqs
    })

@app.route("/api/admin/join_review/details", methods = ["POST"])
def on_api_admin_join_review_details(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    if User.get_by_id(sess.user_id).is_admin() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "Not admin"
        })
    
    req_id = ctx.request.form["req_id"]
    
    req = db.join_requests.find_one({
        "id": req_id
    })
    if req == None:
        return ctx.jsonify({
            "err": 3,
            "msg": "Request not found"
        })
    
    u = User.get_by_id(req["user_id"])
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "user_id": u.id,
        "username": u.name,
        "name": u.real_name,
        "intro": req["intro"],
        "alt_contact": req["alt_contact"],
        "response": req["response"],
        "create_time": req["create_time"]
    })

@app.route("/api/admin/join_review/respond", methods = ["POST"])
def on_api_admin_join_review_respond(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    if User.get_by_id(sess.user_id).is_admin() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "Not admin"
        })
    
    req_id = ctx.request.form["req_id"]
    resp = ctx.request.form["response"]

    db.join_requests.update_one({
        "id": req_id
    }, {
        "$set": {
            "response": resp
        }
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/student/info", methods = ["POST"])
def on_api_student_info(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    if u.is_verified() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "User not verified"
        })
    
    if u.role != "student":
        return ctx.jsonify({
            "err": 3,
            "msg": "User is not a student"
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "user_id": u.id,
        "username": u.name,
        "is_admin": u.is_admin(),
        "name": u.real_name,
        "school_name": u.school_name,
        "class_name": u.class_name
    })

@app.route("/api/student/remove", methods = ["POST"])
def on_api_student_remove(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })

    u = User.get_by_id(sess.user_id)
    if u.is_verified() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "User not verified"
        })
    
    if u.role != "student":
        return ctx.jsonify({
            "err": 3,
            "msg": "User is not a student"
        })
    
    u.remove()

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/global/notification", methods = ["POST"])
def on_api_global_notification(ctx):
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "content": cfg["global_notification"]
    })

@app.route("/api/student/exams", methods = ["POST"])
def on_api_student_exams(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })

    u = User.get_by_id(sess.user_id, with_credentials = True)
    if u.is_verified() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "User not verified"
        })
    
    if u.role != "student":
        return ctx.jsonify({
            "err": 3,
            "msg": "User is not a student"
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "exams": u.get_zhixue_exams()
    })

@app.route("/api/user/request_login", methods = ["POST"])
def on_api_user_request_login(ctx):
    req_id = str(uuid.uuid4())
    current_time = int(time.time() * 1000)

    db.login_requests.insert_one({
        "id": req_id,
        "create_time": current_time,
        "done": False,
        "client_token": ""
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "request_id": req_id
    })

@app.route("/api/user/check_login_status", methods = ["POST"])
async def on_api_user_check_login_status(ctx):
    req_id = ctx.request.form["request_id"]
    r = await db_async.login_requests.find_one({
        "id": req_id
    })
    if r["done"] == True:
        await db_async.login_requests.delete_one({
            "id": req_id
        })
        return ctx.jsonify({
            "err": 0,
            "msg": "OK",
            "client_token": r["client_token"]
        })
    return ctx.jsonify({
        "err": 1,
        "msg": "Not done"
    })


@app.route("/api/auth/callback", methods = ["GET"])
def on_api_auth_callback(ctx):
    req_id = ctx.request.args["request_id"]
    client_token = ctx.request.args["client_token"]

    db.login_requests.update_one({
        "id": req_id
    }, {
        "$set": {
            "done": True,
            "client_token": client_token
        }
    })
    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/update/latest_version", methods = ["POST"])
def on_api_update_latest_version(ctx):
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "version_code": 300,
        "version_description": "各种 Bug 修复 & 新功能"
    })

@app.route("/api/user/qq_connect/status", methods = ["POST"])
def on_api_user_qq_connect_status(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    conn = db.user_qq_connections.find_one({
        "user_id": sess.user_id
    })
    if conn == None:
        return ctx.jsonify({
            "err": 0,
            "msg": "OK",
            "connected": False
        })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "connected": True,
        "qq": conn["qq"],
        "connect_time": conn["create_time"]
    })

@app.route("/api/user/qq_connect/request", methods = ["POST"])
def on_api_user_qq_connect_request(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })

    u = User.get_by_id(sess.user_id)
    if u.is_verified() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "User not verified"
        })
    
    current_time = int(time.time() * 1000)

    req_id_list = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    random.shuffle(req_id_list)
    req_id = ''.join(req_id_list)[:6]
    
    db.qq_connect_requests.delete_many({
        "user_id": u.id
    })
    db.qq_connect_requests.insert_one({
        "user_id": u.id,
        "request_id": req_id,
        "create_time": current_time
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "request_id": req_id
    })

@app.route("/api/user/qq_connect/disconnect", methods = ["POST"])
def on_api_user_qq_connect_disconnect(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    db.user_qq_connections.delete_many({
        "user_id": sess.user_id
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/user/qq_connect/watched_group_messages", methods = ["POST"])
def on_api_user_qq_connect_watched_group_messages(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    msgs = []
    
    it = db.user_qq_watched_group_messages.find({
        "user_id": sess.user_id
    }).sort("create_time", -1).limit(5)
    for msg in it:
        msgs.append({
            "from_qq": msg["from_qq"],
            "from_group": msg["from_group"],
            "content": msg["content"],
            "time": msg["create_time"]
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "messages": msgs
    })

@app.route("/api/user/service_auth_status", methods = ["POST"])
async def on_api_user_service_auth_status(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })

    params = {
        "serviceId": cfg["service_id"],
        "secretKey": cfg["secret_key"],
        "userId": sess.user_id,
        "targetServiceId": cfg["service_id"]
    }

    async with requests.post("https://oneidentity.me/services/api/check_auth", data = params) as resp:
        r = await resp.json()

    if r["err"] != 0:
        authorized = False
    else:
        authorized = True
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "authorized": authorized
    })

@app.route("/api/user/third_party_card/get_all", methods = ["POST"])
def on_api_user_third_party_card_get_all(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)

    cards = []

    for c in db.cp_user_cards.find({ "user_id": u.id }).sort("create_time", 1):
        cards.append({
            "id": c["id"],
            "title": c["title"],
            "service_id": c["service_id"],
            "service_name": c["service_name"],
            "backend_url": c["backend_url"],
            "elements": c["elements"],
            "script_code": c.get("script_code", ""),
            "create_time": c["create_time"]
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "cards": cards
    })

@app.route("/api/user/third_party_card/remove", methods = ["POST"])
def on_api_user_third_party_card_remove(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    card_id = ctx.request.form["card_id"]

    db.cp_user_cards.delete_one({
        "id": card_id,
        "user_id": u.id
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/student/class_notification/recent", methods = ["POST"])
def on_api_student_class_notification_recent(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })

    u = User.get_by_id(sess.user_id)
    if u.is_verified() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "User not verified"
        })
    
    if type(u.class_id) != str or len(u.class_id) == 0:
        return ctx.jsonify({
            "err": 3,
            "msg": "Unable to get class_id of the user"
        })

    limit = int(ctx.request.form["limit"])
    if limit <= 0:
        return ctx.jsonify({
            "err": 4,
            "msg": "Invalid limit"
        })
    
    it = db.class_notifications.find({
        "class_id": u.class_id
    }).sort("create_time", -1).limit(limit)

    notifications = []

    for v in it:
        notifications.append({
            "publisher": User.get_by_id(v["user_id"]).real_name,
            "content": v["content"],
            "time": v["create_time"]
        })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "notifications": notifications
    })

@app.route("/api/student/class_notification/add", methods = ["POST"])
def on_api_student_class_notification_add(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })

    u = User.get_by_id(sess.user_id)
    if u.is_verified() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "User not verified"
        })
    
    if type(u.class_id) != str or len(u.class_id) == 0:
        return ctx.jsonify({
            "err": 3,
            "msg": "Unable to get class_id of the user"
        })
    
    content = ctx.request.form["content"]
    
    current_time = int(time.time() * 1000)
    
    db.class_notifications.insert_one({
        "user_id": u.id,
        "class_id": u.class_id,
        "content": content,
        "create_time": current_time
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/admin/push/global", methods = ["POST"])
def on_api_admin_push_global(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    if User.get_by_id(sess.user_id).is_admin() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "Not admin"
        })
    
    title = ctx.request.form["title"]
    content = ctx.request.form["content"]
    article_id = ctx.request.form["article_id"]

    current_time = int(time.time() * 1000)
    notification_id = str(uuid.uuid4())

    if db.articles.find_one({"id": article_id}) == None:
        return ctx.jsonify({
            "err": 3,
            "msg": "Article not found"
        })

    db.global_notifications.insert_one({
        "id": notification_id,
        "sender": sess.user_id,
        "title": title,
        "content": content,
        "article_id": article_id,
        "create_time": current_time
    })

    jpush.push_global_notification(title, content, {
        "type": "global",
        "id": notification_id
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/admin/article/add", methods = ["POST"])
def on_api_admin_article_add(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    if User.get_by_id(sess.user_id).is_admin() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "Not admin"
        })
    
    current_time = int(time.time() * 1000)
    article_id = str(uuid.uuid4())

    blog_article_id = int(ctx.request.form["blog_article_id"])

    url = "https://hydrocloud.net/archives/" + str(blog_article_id) + "/?format=raw"
    with requests.get(url) as resp:
        data = resp.text

    try:
        title = data.split("<Title>")[1].split("</Title>")[0]
        author = data.split("<Author>")[1].split("</Author>")[0]
        content = data.split("<Content>")[1].split("</Content>")[0]
    except:
        return ctx.jsonify({
            "err": 3,
            "msg": "Article parsing failed"
        })

    db.articles.insert_one({
        "id": article_id,
        "blog_article_id": blog_article_id,
        "title": title,
        "author": author,
        "content": content,
        "add_time": current_time
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "article_id": article_id
    })

@app.route("/api/logging/add", methods = ["POST"])
def on_api_logging_add(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    log_type = ctx.request.form["type"]
    details = json.loads(ctx.request.form["details"])
    log_id = str(uuid.uuid4())
    current_time = int(time.time() * 1000)

    db.user_logs.insert_one({
        "id": log_id,
        "user_id": sess.user_id,
        "type": log_type,
        "details": details,
        "create_time": current_time
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/device/register", methods = ["POST"])
def on_api_device_register(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    jpush_id = ctx.request.form["jpush_id"]

    r = db.devices.find_one({
        "jpush_id": jpush_id,
        "user_id": sess.user_id
    })
    if r != None:
        return ctx.jsonify({
            "err": 0,
            "msg": "OK",
            "device_id": r["id"]
        })

    device_id = str(uuid.uuid4())
    current_time = int(time.time() * 1000)

    db.devices.delete_many({
        "jpush_id": jpush_id
    })
    db.devices.insert_one({
        "id": device_id,
        "jpush_id": jpush_id,
        "user_id": sess.user_id,
        "create_time": current_time
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "device_id": device_id
    })

@app.route("/api/device/global_notification/article_id", methods = ["POST"])
def on_api_device_get_push_action(ctx):
    notification_id = ctx.request.form["notification_id"]
    ntf = db.global_notifications.find_one({
        "id": notification_id
    })
    if ntf == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Notification not found"
        })
    
    article_id = ntf.get("article_id", None)
    if article_id == None:
        return ctx.jsonify({
            "err": 2,
            "msg": "No related article"
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "article_id": article_id
    })

@app.route("/api/device/user_notification/details", methods = ["POST"])
def on_api_device_user_notification_details(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)

    details = u.get_notification_details(ctx.request.form["notification_id"])
    if details == None:
        return ctx.jsonify({
            "err": 2,
            "msg": "Notification not found"
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "details": details
    })

@app.route("/api/article/get", methods = ["POST"])
def on_api_article_get(ctx):
    article_id = ctx.request.form["id"]
    article = db.articles.find_one({
        "id": article_id
    })

    if article == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Article not found"
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "id": article["id"],
        "title": article["title"],
        "author": article["author"],
        "content": article["content"]
    })

@app.route("/api/article/list", methods = ["POST"])
def on_api_article_list(ctx):
    articles = []
    for item in db.articles.find({}).sort("add_time", -1).limit(10):
        articles.append({
            "id": item["id"],
            "title": item["title"],
            "author": item["author"]
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "articles": articles
    })

@app.route("/api/join/request", methods = ["POST"])
def on_api_join_request(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    if u.is_verified() == False:
        return ctx.jsonify({
            "err": 2,
            "msg": "You need to be verified"
        })
    
    intro = ctx.request.form["intro"]
    alt_contact = ctx.request.form["alt_contact"]
    current_time = int(time.time() * 1000)
    req_id = str(uuid.uuid4())

    db.join_requests.delete_many({
        "user_id": u.id
    })

    db.join_requests.insert_one({
        "id": req_id,
        "user_id": u.id,
        "intro": intro,
        "alt_contact": alt_contact,
        "response": "",
        "create_time": current_time
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/join/my_request", methods = ["POST"])
def on_api_join_my_request(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    req = db.join_requests.find_one({
        "user_id": sess.user_id
    })
    if req == None:
        return ctx.jsonify({
            "err": 2,
            "msg": "No join requests"
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "id": req["id"],
        "intro": req["intro"],
        "alt_contact": req["alt_contact"],
        "response": req["response"],
        "create_time": req["create_time"]
    })

@app.route("/api/pm/send", methods = ["POST"])
def on_api_pm_send(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    if u.pm_disabled:
        return ctx.jsonify({
            "err": 2,
            "msg": "The user is not allowed to send private messages."
        })
    
    t = User.get_by_name(ctx.request.form["target"])
    if t == None:
        return ctx.jsonify({
            "err": 3,
            "msg": "Target user not found"
        })

    if db.pm_blocks.find_one({ "from": u.id, "to": t.id }) != None:
        return ctx.jsonify({
            "err": 4,
            "msg": "Blocked"
        })
    
    pm_id = str(uuid.uuid4())
    content = ctx.request.form["content"]
    current_time = int(time.time() * 1000)
    
    db.private_messages.insert_one({
        "id": pm_id,
        "from": u.id,
        "to": t.id,
        "content":  content,
        "create_time": current_time
    })

    user_notification_queue.append(UserNotification(t, "新的私信", u.real_name + " (" + u.name + ")", {
        "subtype": "pm",
        "pm_id": pm_id
    }))

    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "pm_id": pm_id
    })

@app.route("/api/pm/list", methods = ["POST"])
def on_api_pm_list(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    limit = int(ctx.request.form["limit"])
    if limit <= 0:
        return ctx.jsonify({
            "err": 2,
            "msg": "Invalid limit"
        })

    pms = db.private_messages.find({ "to": u.id }).sort("create_time", -1).limit(limit)
    to_me = []

    for pm in pms:
        to_me.append({
            "id": pm["id"],
            "from": User.get_by_id(pm["from"]).name,
            "from_real_name": User.get_by_id(pm["from"]).real_name,
            "time": pm["create_time"]
        })
    
    pms = db.private_messages.find({ "from": u.id }).sort("create_time", -1).limit(limit)
    from_me = []

    for pm in pms:
        from_me.append({
            "id": pm["id"],
            "to": User.get_by_id(pm["to"]).name,
            "to_real_name": User.get_by_id(pm["to"]).real_name,
            "time": pm["create_time"]
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "from_me": from_me,
        "to_me": to_me
    })

@app.route("/api/pm/conversation", methods = ["POST"])
def on_api_pm_conversation(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    t = User.get_by_name(ctx.request.form["target"])

    pms = db.private_messages.find({ "from": t.id, "to": u.id }).sort("create_time", -1)
    to_me = []

    for pm in pms:
        to_me.append({
            "id": pm["id"],
            "content": pm["content"],
            "time": pm["create_time"]
        })
    
    pms = db.private_messages.find({ "from": u.id, "to": t.id }).sort("create_time", -1)
    from_me = []

    for pm in pms:
        from_me.append({
            "id": pm["id"],
            "content": pm["content"],
            "time": pm["create_time"]
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "from_me": from_me,
        "to_me": to_me,
        "target_real_name": t.real_name
    })

@app.route("/api/pm/details", methods = ["POST"])
def on_api_pm_details(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    pm_id = ctx.request.form["pm_id"]

    pm = db.private_messages.find_one({
        "id": pm_id,
        "to": u.id
    })
    if pm == None:
        pm = db.private_messages.find_one({
            "id": pm_id,
            "from": u.id
        })
        if pm == None:
            return ctx.jsonify({
                "err": 2,
                "msg": "Private message not found"
            })
        
    from_u = User.get_by_id(pm["from"])
    to_u = User.get_by_id(pm["to"])
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "pm": {
            "id": pm["id"],
            "from": from_u.name,
            "to": to_u.name,
            "from_real_name": from_u.real_name,
            "to_real_name": to_u.real_name,
            "content": pm["content"],
            "time": pm["create_time"]
        }
    })

@app.route("/api/pm/block", methods = ["POST"])
def on_api_pm_block(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    f = User.get_by_name(ctx.request.form["from"])

    if db.pm_blocks.find_one({ "from": f.id, "to": u.id }) != None:
        return ctx.jsonify({
            "err": 2,
            "msg": "Already blocked"
        })
    
    block_id = str(uuid.uuid4())
    current_time = int(time.time() * 1000)
    
    db.pm_blocks.insert_one({
        "id": block_id,
        "from": f.id,
        "to": u.id,
        "create_time": current_time
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/pm/block_list", methods = ["POST"])
def on_api_pm_block_list(ctx):
    sess = Session.get(ctx)
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    result = []

    for b in db.pm_blocks.find({ "to": u.id }).sort("create_time", -1):
        result.append({
            "id": b["id"],
            "from": User.get_by_id(b["from"]).name,
            "time": b["create_time"]
        })
    
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "block_list": result
    })

qqbot_token = None
qqbot_service_id = "fd44ac0a-74a9-453e-9a23-f2b2ffdce9f2"

@app.route("/api/qqbot/get_session", methods = ["POST"])
async def on_api_qqbot_get_session(ctx):
    token = ctx.request.form["token"]
    async with requests.post("https://oneidentity.me/services/api/get_info_by_token", data = { "token": token }) as resp:
        info = await resp.json()
    if info["err"] != 0 or info["service_id"] != qqbot_service_id:
        return ctx.jsonify({
            "err": 1,
            "msg": "Verification failed"
        })
    
    global qqbot_token
    qqbot_token = str(uuid.uuid4())
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "token": qqbot_token
    })

@app.route("/api/qqbot/verify_user", methods = ["POST"])
def on_api_qqbot_verify_user(ctx):
    token = ctx.request.form["token"]
    if qqbot_token == None or qqbot_token != token:
        return ctx.jsonify({
            "err": 1,
            "msg": "Invalid token"
        })
    
    username = ctx.request.form["username"]
    req_id = ctx.request.form["request_id"]
    qq = ctx.request.form["qq"]

    current_time = int(time.time() * 1000)

    u = User.get_by_name(username)
    if u == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "User not found"
        })
    
    req = db.qq_connect_requests.find_one({
        "user_id": u.id
    })
    if req == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "No requests for the user"
        })
    
    if req["request_id"] != req_id:
        return ctx.jsonify({
            "err": 1,
            "msg": "Incorrect request id"
        })
    
    db.qq_connect_requests.delete_many({
        "user_id": u.id
    })

    db.user_qq_connections.delete_many({
        "user_id": u.id
    })

    db.user_qq_connections.insert_one({
        "user_id": u.id,
        "qq": qq,
        "create_time": current_time
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/qqbot/add_user_watched_group_messages", methods = ["POST"])
def on_api_qqbot_add_user_watched_group_messages(ctx):
    token = ctx.request.form["token"]
    if qqbot_token == None or qqbot_token != token:
        return ctx.jsonify({
            "err": 1,
            "msg": "Invalid token"
        })
    
    fail_count = 0

    msgs = json.loads(ctx.request.form["messages"])
    for m in msgs:
        user_id = m.get("user_id", None)
        if user_id == None:
            item = db.user_qq_connections.find_one({
                "qq": m["qq"]
            })
            if item == None:
                user_id = None
            else:
                user_id = item["user_id"]
        if user_id == None:
            fail_count += 1
            continue

        u = User.get_by_id(user_id)
        if u == None:
            fail_count += 1
            continue
        
        from_qq = m["from_qq"]
        from_group = m["from_group"]
        
        user_notification_queue.append(UserNotification(u, "关注的 QQ 群消息", "群: " + from_group, {}))
        db.user_qq_watched_group_messages.insert_one({
            "user_id": user_id,
            "from_qq": from_qq,
            "from_group": from_group,
            "content": m["content"],
            "create_time": m["create_time"]
        })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "fail_count": fail_count
    })

@app.route("/api/card_provider/get_session", methods = ["POST"])
async def on_api_card_provider_get_session(ctx):
    token = ctx.request.form["token"]
    async with requests.post("https://oneidentity.me/services/api/get_info_by_token", data = { "token": token }) as resp:
        info = await resp.json()

    if info["err"] != 0:
        return ctx.jsonify({
            "err": 1,
            "msg": "Verification failed"
        })
    
    service_id = info["service_id"]
    
    u = await User.get_by_id_async(ctx.request.form["user_id"])
    if u == None:
        return ctx.jsonify({
            "err": 2,
            "msg": "User not found"
        })
    
    params = {
        "serviceId": cfg["service_id"],
        "secretKey": cfg["secret_key"],
        "userId": u.id,
        "targetServiceId": service_id
    }
    async with requests.post("https://oneidentity.me/services/api/check_auth", data = params) as resp:
        r = await resp.json()

    if r["err"] != 0:
        return ctx.jsonify({
            "err": 3,
            "msg": "Our service is not authorized by the user"
        })
    
    if r["status"] != True:
        return ctx.jsonify({
            "err": 4,
            "msg": "Your service is not authorized by the user"
        })
    
    session_token = str(uuid.uuid4())
    current_time = int(time.time() * 1000)

    await db_async.cp_sessions.delete_many({
        "user_id": u.id,
        "service_id": info["service_id"]
    })

    await db_async.cp_sessions.insert_one({
        "token": session_token,
        "user_id": u.id,
        "service_id": info["service_id"],
        "service_name": info["service_name"],
        "create_time": current_time
    })
    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "token": session_token
    })

@app.route("/api/card_provider/add_card", methods = ["POST"])
def on_api_card_provider_add_card(ctx):
    token = ctx.request.form["token"]
    sess = db.cp_sessions.find_one({
        "token": token
    })
    if sess == None:
        return ctx.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess["user_id"])
    card = json.loads(ctx.request.form["card"])

    card_id = str(uuid.uuid4())
    title = str(card["title"])
    backend_url = str(card.get("backend_url", ""))
    elements = list(card["elements"])
    script_code = str(card.get("script_code", ""))
    current_time = int(time.time() * 1000)

    db.cp_user_cards.delete_many({
        "user_id": u.id,
        "service_id": sess["service_id"],
        "title": title
    })

    db.cp_user_cards.insert_one({
        "id": card_id,
        "user_id": u.id,
        "service_id": sess["service_id"],
        "service_name": sess["service_name"],
        "title": title,
        "backend_url": backend_url,
        "elements": elements,
        "script_code": script_code,
        "create_time": current_time
    })

    return ctx.jsonify({
        "err": 0,
        "msg": "OK",
        "card_id": card_id
    })

def user_push_thread():
    global user_notification_queue

    while True:
        try:
            q = user_notification_queue
            user_notification_queue = []

            for p in q:
                if isinstance(p, UserNotification) == False:
                    print("Not a UserNotification")
                    continue
                p.user.push_notification(p.title, p.content, p.details)
                print("Pushed a notification to user " + p.user.id)
        except:
            print("user_push_thread: Caught exception")
        
        time.sleep(1)

upt = threading.Thread(target = user_push_thread)
upt.daemon = True
upt.start()

app.core.listen("127.0.0.1:" + str(cfg["service_port"]))
