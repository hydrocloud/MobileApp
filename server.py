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

gevent.monkey.patch_all()

app = flask.Flask(__name__)
app_internal = flask.Flask(__name__)
cfg = {}
db = pymongo.MongoClient("127.0.0.1", 27017).HydroCloud_MobileApp

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
        "version_code": 1,
        "version_description": "Initial release"
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

#gevent.spawn(lambda: gevent.pywsgi.WSGIServer(("0.0.0.0", cfg["internal_service_port"]), app_internal).serve_forever())
gevent.pywsgi.WSGIServer(("0.0.0.0", cfg["service_port"]), app).serve_forever()
