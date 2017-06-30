import base64
import requests

pw_enc_key_b64 = "ZajoQb0/Zt35YuB2ItEOJiAK"
pw_enc_key = base64.b64decode(pw_enc_key_b64)

def encode_pw(pw):
    pos = 0
    r = ""

    for i in pw:
        s = hex(ord(i) ^ pw_enc_key[pos])[2:]
        while len(s) < 2:
            s = '0' + s
        r += s
        pos += 1
    
    return r

def login(username, pw):
    r = requests.post("http://www.zhixue.com/container/app/login", data = {
        "loginName": username,
        "password": encode_pw(pw),
        "description": "{'encrypt':['password']}"
    }).json()

    return r
