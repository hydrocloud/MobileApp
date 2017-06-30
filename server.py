import sys
import json
import flask
import gevent
import gevent.pywsgi
import gevent.monkey
import pymongo
import requests
import uuid
import zhixue
import oneidentity_dc

gevent.monkey.patch_all()

app = flask.Flask(__name__)
app_internal = flask.Flask(__name__)
cfg = {}
db = pymongo.MongoClient("127.0.0.1", 27017).HydroCloud_StudentIDService

with open(sys.argv[1], "rb") as f:
    cfg = json.loads(f.read().decode("utf-8"))

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

        self.disabled = False
    
    @staticmethod
    def get_by_id(id):
        u = db.users.find_one({
            "id": id
        })
        if u == None or u.get("disabled", False) == True:
            return None
        return User(id = id, name = u["name"], role = u["role"], real_name = u["real_name"], student_id = u["student_id"], school_id = u["school_id"], school_name = u["school_name"], class_id = u["class_id"], class_name = u["class_name"])
    
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
    
    def load_student_info_from_zhixue_login_response(self, resp):
        if resp["errorCode"] != 0:
            raise Exception("Login failed")
        r = resp["result"]
        self.real_name = r["name"]
        self.student_id = r["userInfo"]["studentNo"]
        self.school_id = r["userInfo"]["school"]["schoolId"]
        self.school_name = r["userInfo"]["school"]["schoolName"]
        self.class_id = r["clazzInfo"]["id"]
        self.class_name = r["clazzInfo"]["name"]
        self.role = "student"

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

class DomainController(oneidentity_dc.DomainController):
    def verify_school_and_add_user(self, u):
        if u.school_name != "江苏省南通中学":
            return {
                "ok": False,
                "msg": "当前用户所在学校不受支持"
            }
        self.add_user(u.id)
        return {
            "ok": True
        }

    def on_join(self, user_id, form):
        u = User.get_by_id(user_id)

        if form != None and type(form) == str: # Workaround
            form = json.loads(form)

        if u == None:
            user_info = self.get_user_basic_info(user_id)
            u = User(id = user_id, name = user_info["name"])
            u.update_or_insert()
        if form == None:
            if u.is_verified() == False:
                return {
                    "ok": False,
                    "form": [
                        {
                            "name": "zhixue_username",
                            "description": "智学网用户名",
                            "type": "text"
                        },
                        {
                            "name": "zhixue_password",
                            "description": "智学网密码",
                            "type": "password"
                        }
                    ]
                }
            return self.verify_school_and_add_user(u)
        else:
            r = zhixue.login(form["zhixue_username"], form["zhixue_password"])
            try:
                u.load_student_info_from_zhixue_login_response(r)
            except:
                return {
                    "ok": False,
                    "msg": "无法使用提供的用户名和密码登录智学网"
                }
            u.update_or_insert()
            return self.verify_school_and_add_user(u)
    
    def on_quit(self, user_id):
        self.remove_user(user_id)
        return {
            "ok": True
        }

dc = DomainController(cfg["domain_token"])

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
        "verified": u.is_verified()
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
    
    r = zhixue.login(flask.request.form["username"], flask.request.form["password"])
    try:
        u.load_student_info_from_zhixue_login_response(r)
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

@app_internal.route("/info/student", methods = ["POST"])
def on_internal_info_student():
    req = flask.request.get_json(force = True)
    user_id = req.get("user_id", None)
    if type(user_id) != str:
        return flask.jsonify({
            "err": 1,
            "msg": "Invalid request"
        })
    
    u = User.get_by_id(user_id)
    if u == None:
        return flask.jsonify({
            "err": 2,
            "msg": "User not found"
        })
    
    return flask.jsonify({
        "err": 0,
        "msg": "OK",
        "name": u.real_name,
        "school_id": u.school_id,
        "school_name": u.school_name,
        "class_id": u.class_id,
        "class_name": u.class_name
    })

gevent.spawn(lambda: dc.run())
gevent.spawn(lambda: gevent.pywsgi.WSGIServer(("0.0.0.0", cfg["internal_service_port"]), app_internal).serve_forever())
gevent.pywsgi.WSGIServer(("0.0.0.0", cfg["service_port"]), app).serve_forever()
