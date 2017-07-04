import sys
import time
import json
import flask
import gevent
import gevent.pywsgi
import gevent.monkey
import pymongo
import requests
import uuid
import zhixue
import random
import jpush

gevent.monkey.patch_all()

app = flask.Flask(__name__)
app_internal = flask.Flask(__name__)
cfg = {}
db = pymongo.MongoClient("127.0.0.1", 27017).HydroCloud_MobileApp

with open(sys.argv[1], "rb") as f:
    cfg = json.loads(f.read().decode("utf-8"))

jpush.app_key = cfg["jpush_app_key"]
jpush.master_secret = cfg["jpush_master_secret"]

class Session:
    def __init__(self, user_id, username):
        self.token = str(uuid.uuid4())
        self.user_id = user_id
        self.username = username

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

        self.disabled = False
    
    @staticmethod
    def get_by_id(id, with_credentials = False):
        u = db.users.find_one({
            "id": id
        })
        if u == None or u.get("disabled", False) == True:
            return None
        
        ret = User(id = id, name = u["name"], role = u["role"], real_name = u["real_name"], student_id = u["student_id"], school_id = u["school_id"], school_name = u["school_name"], class_id = u["class_id"], class_name = u["class_name"])
        if with_credentials:
            ret.zhixue_username = u["zhixue_username"]
            ret.zhixue_password = u["zhixue_password"]

        return ret
    
    @staticmethod
    def get_by_name(name, with_credentials = False):
        u = db.users.find_one({
            "name": name
        })
        if u == None or u.get("disabled", False) == True:
            return None
        
        ret = User(id = u["id"], name = name, role = u["role"], real_name = u["real_name"], student_id = u["student_id"], school_id = u["school_id"], school_name = u["school_name"], class_id = u["class_id"], class_name = u["class_name"])
        if with_credentials:
            ret.zhixue_username = u["zhixue_username"]
            ret.zhixue_password = u["zhixue_password"]

        return ret
    
    def update(self):
        return db.users.update_one({
            "id": self.id
        }, {
            "$set": {
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
                "disabled": self.disabled
            }
        })
    
    def insert(self):
        return db.users.insert_one({
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
            "disabled": self.disabled
        })
    
    def update_or_insert(self):
        r = self.update()
        if r.matched_count == 0:
            self.insert()
    
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

sessions = {}

@app.route("/api/user/login", methods = ["POST"])
def on_api_user_login():
    client_token = flask.request.form["client_token"]

    r = requests.post("https://oneidentity.me/identity/verify/verify_client_token", data = {
        "client_token": client_token
    }).json()
    if r["err"] != 0:
        return flask.jsonify({
            "err": 1,
            "msg": "Verification failed"
        })

    u = User.get_by_id(r["userId"])
    if u == None:
        u = User(id = r["userId"], name = r["username"])
        u.update_or_insert()
    
    sess = Session(r["userId"], r["username"])
    sessions[sess.token] = sess
    resp = flask.make_response()
    resp.set_cookie("token", sess.token)

    pt = str(uuid.uuid4())
    db.persistent_tokens.insert_one({
        "token": pt,
        "user_id": sess.user_id,
        "username": sess.username
    })

    resp.set_data(json.dumps({
        "err": 0,
        "msg": "OK",
        "persistent_token": pt
    }))
    return resp

@app.route("/api/user/auto_login", methods = ["POST"])
def on_api_user_auto_login():
    pt = flask.request.form["persistent_token"]
    info = db.persistent_tokens.find_one({
        "token": pt
    })
    if info == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Invalid persistent token"
        })
    
    sess = Session(info["user_id"], info["username"])
    sessions[sess.token] = sess
    resp = flask.make_response()
    resp.set_cookie("token", sess.token)

    resp.set_data(json.dumps({
        "err": 0,
        "msg": "OK"
    }))
    return resp

@app.route("/api/user/info", methods = ["POST"])
def on_api_user_info():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    
    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "user_id": sess.user_id,
        "username": sess.username,
        "role": u.role,
        "verified": u.is_verified(),
        "is_admin": u.is_admin()
    })

@app.route("/api/user/verify/zhixue", methods = ["POST"])
def on_api_user_verify_zhixue():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)

    username = flask.request.form["username"]
    pw = flask.request.form["password"]
    
    r = zhixue.login(username, pw)
    try:
        u.load_student_info_from_zhixue_login_response(username, pw, r)
    except:
        return flask.jsonify({
            "err": 2,
            "msg": "Login failed"
        })
    
    u.update_or_insert()

    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "name": u.real_name,
        "school_name": u.school_name,
        "class_name": u.class_name
    })

@app.route("/api/admin/user/verify", methods = ["POST"])
def on_api_admin_user_verify():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    if User.get_by_id(sess.user_id).is_admin() == False:
        return flask.jsonify({
            "err": 2,
            "msg": "Not admin"
        })
    
    t = User.get_by_name(flask.request.form["target"])
    if t == None:
        return flask.jsonify({
            "err": 3,
            "msg": "Target user not found"
        })
    
    if t.is_verified():
        return flask.jsonify({
            "err": 4,
            "msg": "Already verified"
        })
    
    t.real_name = flask.request.form["real_name"]
    t.school_name = flask.request.form["school_name"]
    t.class_name = flask.request.form["class_name"]
    t.role = "student"

    student_id = flask.request.form.get("student_id", None)
    if student_id != None and len(student_id) > 0:
        t.student_id = student_id
    
    t.update()
    return flask.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/student/info", methods = ["POST"])
def on_api_student_info():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    u = User.get_by_id(sess.user_id)
    if u.is_verified() == False:
        return flask.jsonify({
            "err": 2,
            "msg": "User not verified"
        })
    
    if u.role != "student":
        return flask.jsonify({
            "err": 3,
            "msg": "User is not a student"
        })
    
    return flask.jsonify({
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
def on_api_student_remove():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })

    u = User.get_by_id(sess.user_id)
    if u.is_verified() == False:
        return flask.jsonify({
            "err": 2,
            "msg": "User not verified"
        })
    
    if u.role != "student":
        return flask.jsonify({
            "err": 3,
            "msg": "User is not a student"
        })
    
    u.remove()

    return flask.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/global/notification", methods = ["POST"])
def on_api_global_notification():
    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "content": cfg["global_notification"]
    })

@app.route("/api/student/exams", methods = ["POST"])
def on_api_student_exams():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })

    u = User.get_by_id(sess.user_id, with_credentials = True)
    if u.is_verified() == False:
        return flask.jsonify({
            "err": 2,
            "msg": "User not verified"
        })
    
    if u.role != "student":
        return flask.jsonify({
            "err": 3,
            "msg": "User is not a student"
        })
    
    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "exams": u.get_zhixue_exams()
    })

@app.route("/api/user/request_login", methods = ["POST"])
def on_api_user_request_login():
    req_id = str(uuid.uuid4())
    current_time = int(time.time() * 1000)

    db.login_requests.insert_one({
        "id": req_id,
        "create_time": current_time,
        "done": False,
        "client_token": ""
    })

    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "request_id": req_id
    })

@app.route("/api/user/check_login_status", methods = ["POST"])
def on_api_user_check_login_status():
    req_id = flask.request.form["request_id"]
    r = db.login_requests.find_one({
        "id": req_id
    })
    if r["done"] == True:
        db.login_requests.delete_one({
            "id": req_id
        })
        return flask.jsonify({
            "err": 0,
            "msg": "OK",
            "client_token": r["client_token"]
        })
    return flask.jsonify({
        "err": 1,
        "msg": "Not done"
    })


@app.route("/api/auth/callback", methods = ["GET"])
def on_api_auth_callback():
    req_id = flask.request.args["request_id"]
    client_token = flask.request.args["client_token"]
    db.login_requests.update_one({
        "id": req_id
    }, {
        "$set": {
            "done": True,
            "client_token": client_token
        }
    })
    return flask.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/update/latest_version", methods = ["POST"])
def on_api_update_latest_version():
    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "version_code": 100,
        "version_description": "各种 Bug 修复 & 新功能"
    })

@app.route("/api/user/qq_connect/status", methods = ["POST"])
def on_api_user_qq_connect_status():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    conn = db.user_qq_connections.find_one({
        "user_id": sess.user_id
    })
    if conn == None:
        return flask.jsonify({
            "err": 0,
            "msg": "OK",
            "connected": False
        })

    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "connected": True,
        "qq": conn["qq"],
        "connect_time": conn["create_time"]
    })

@app.route("/api/user/qq_connect/request", methods = ["POST"])
def on_api_user_qq_connect_request():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })

    u = User.get_by_id(sess.user_id)
    if u.is_verified() == False:
        return flask.jsonify({
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

    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "request_id": req_id
    })

@app.route("/api/user/qq_connect/disconnect", methods = ["POST"])
def on_api_user_qq_connect_disconnect():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    db.user_qq_connections.delete_many({
        "user_id": sess.user_id
    })

    return flask.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/user/qq_connect/watched_group_messages", methods = ["POST"])
def on_api_user_qq_connect_watched_group_messages():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
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
    
    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "messages": msgs
    })

@app.route("/api/student/class_notification/recent", methods = ["POST"])
def on_api_student_class_notification_recent():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })

    u = User.get_by_id(sess.user_id)
    if u.is_verified() == False:
        return flask.jsonify({
            "err": 2,
            "msg": "User not verified"
        })
    
    if type(u.class_id) != str or len(u.class_id) == 0:
        return flask.jsonify({
            "err": 3,
            "msg": "Unable to get class_id of the user"
        })

    limit = int(flask.request.form["limit"])
    if limit <= 0:
        return flask.jsonify({
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

    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "notifications": notifications
    })

@app.route("/api/student/class_notification/add", methods = ["POST"])
def on_api_student_class_notification_add():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })

    u = User.get_by_id(sess.user_id)
    if u.is_verified() == False:
        return flask.jsonify({
            "err": 2,
            "msg": "User not verified"
        })
    
    if type(u.class_id) != str or len(u.class_id) == 0:
        return flask.jsonify({
            "err": 3,
            "msg": "Unable to get class_id of the user"
        })
    
    content = flask.request.form["content"]
    
    current_time = int(time.time() * 1000)
    
    db.class_notifications.insert_one({
        "user_id": u.id,
        "class_id": u.class_id,
        "content": content,
        "create_time": current_time
    })

    return flask.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/admin/push/global", methods = ["POST"])
def on_api_admin_push_global():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    if User.get_by_id(sess.user_id).is_admin() == False:
        return flask.jsonify({
            "err": 2,
            "msg": "Not admin"
        })
    
    title = flask.request.form["title"]
    content = flask.request.form["content"]
    article_id = flask.request.form["article_id"]

    current_time = int(time.time() * 1000)
    notification_id = str(uuid.uuid4())

    if db.articles.find_one({"id": article_id}) == None:
        return flask.jsonify({
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

    return flask.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/admin/article/add", methods = ["POST"])
def on_api_admin_article_add():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    if User.get_by_id(sess.user_id).is_admin() == False:
        return flask.jsonify({
            "err": 2,
            "msg": "Not admin"
        })
    
    current_time = int(time.time() * 1000)
    article_id = str(uuid.uuid4())

    blog_article_id = int(flask.request.form["blog_article_id"])

    url = "https://hydrocloud.net/archives/" + str(blog_article_id) + "/?format=raw"
    data = requests.get(url).text

    try:
        title = data.split("<Title>")[1].split("</Title>")[0]
        author = data.split("<Author>")[1].split("</Author>")[0]
        content = data.split("<Content>")[1].split("</Content>")[0]
    except:
        return flask.jsonify({
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

    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "article_id": article_id
    })

@app.route("/api/device/register", methods = ["POST"])
def on_api_device_register():
    sess = sessions.get(flask.request.cookies["token"], None)
    if sess == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Session not found"
        })
    
    jpush_id = flask.request.form["jpush_id"]

    r = db.devices.find_one({
        "jpush_id": jpush_id,
        "user_id": sess.user_id
    })
    if r != None:
        return flask.jsonify({
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

    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "device_id": device_id
    })

@app.route("/api/device/global_notification/article_id", methods = ["POST"])
def on_api_device_get_push_action():
    notification_id = flask.request.form["notification_id"]
    ntf = db.global_notifications.find_one({
        "id": notification_id
    })
    if ntf == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Notification not found"
        })
    
    article_id = ntf.get("article_id", None)
    if article_id == None:
        return flask.jsonify({
            "err": 2,
            "msg": "No related article"
        })
    
    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "article_id": article_id
    })

@app.route("/api/article/get", methods = ["POST"])
def on_api_article_get():
    article_id = flask.request.form["id"]
    article = db.articles.find_one({
        "id": article_id
    })

    if article == None:
        return flask.jsonify({
            "err": 1,
            "msg": "Article not found"
        })
    
    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "id": article["id"],
        "title": article["title"],
        "author": article["author"],
        "content": article["content"]
    })

@app.route("/api/article/list", methods = ["POST"])
def on_api_article_list():
    articles = []
    for item in db.articles.find({}).sort("add_time", -1).limit(10):
        articles.append({
            "id": item["id"],
            "title": item["title"],
            "author": item["author"]
        })
    
    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "articles": articles
    })

qqbot_token = None
qqbot_service_id = "fd44ac0a-74a9-453e-9a23-f2b2ffdce9f2"

@app.route("/api/qqbot/get_session", methods = ["POST"])
def on_api_qqbot_get_session():
    token = flask.request.form["token"]
    info = requests.post("https://oneidentity.me/services/api/get_info_by_token", data = {
        "token": token
    }).json()
    if info["err"] != 0 or info["service_id"] != qqbot_service_id:
        return flask.jsonify({
            "err": 1,
            "msg": "Verification failed"
        })
    
    global qqbot_token
    qqbot_token = str(uuid.uuid4())
    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "token": qqbot_token
    })

@app.route("/api/qqbot/verify_user", methods = ["POST"])
def on_api_qqbot_verify_user():
    token = flask.request.form["token"]
    if qqbot_token == None or qqbot_token != token:
        return flask.jsonify({
            "err": 1,
            "msg": "Invalid token"
        })
    
    username = flask.request.form["username"]
    req_id = flask.request.form["request_id"]
    qq = flask.request.form["qq"]

    current_time = int(time.time() * 1000)

    u = User.get_by_name(username)
    if u == None:
        return flask.jsonify({
            "err": 1,
            "msg": "User not found"
        })
    
    req = db.qq_connect_requests.find_one({
        "user_id": u.id
    })
    if req == None:
        return flask.jsonify({
            "err": 1,
            "msg": "No requests for the user"
        })
    
    if req["request_id"] != req_id:
        return flask.jsonify({
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

    return flask.jsonify({
        "err": 0,
        "msg": "OK"
    })

@app.route("/api/qqbot/add_user_watched_group_messages", methods = ["POST"])
def on_api_qqbot_add_user_watched_group_messages():
    token = flask.request.form["token"]
    if qqbot_token == None or qqbot_token != token:
        return flask.jsonify({
            "err": 1,
            "msg": "Invalid token"
        })
    
    fail_count = 0

    msgs = json.loads(flask.request.form["messages"])
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
        db.user_qq_watched_group_messages.insert_one({
            "user_id": user_id,
            "from_qq": m["from_qq"],
            "from_group": m["from_group"],
            "content": m["content"],
            "create_time": m["create_time"]
        })

    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "fail_count": fail_count
    })

#gevent.spawn(lambda: gevent.pywsgi.WSGIServer(("0.0.0.0", cfg["internal_service_port"]), app_internal).serve_forever())
gevent.pywsgi.WSGIServer(("0.0.0.0", cfg["service_port"]), app).serve_forever()
