#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Tue Sep 20 18:40:56 2022

@author: InfinityCoding
"""
from __future__ import print_function
import sys
from requests import request
from pypresence import Presence
import time
from flask import *
from flask_cors import CORS

CLIENT_ID = "1020359247059497071"
app = Flask(__name__)
CORS(app, resources={r"/rpc_anime": {"origins": "*"}})
RPC = Presence(CLIENT_ID)

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/rpc')  
def rpc_default():  
    return render_template('rpc_default.html')
  
@app.route('/rpc_anime',methods = ['POST', 'GET'])  
def rpc_anime():  
    if request.method == "POST":
        print("\033[92m[INFO]:\033[00m Getting datas from rpc_anime.html", file=sys.stdout)
        result = request.get_json()
        
        if result["type"] == "update":
            # TODO: Change between hosts
            RPC.update(
                large_image=result["host"],
                large_text=f"{result['host']} Logo",
                details=result["details"],
                state=result["state"],
                start=int(time.time()),
                buttons=[{"label":"My AniList", "url":result["anilist"]}]
            )
            print("\033[92m[INFO]:\033[00m Started Disord RPC with Anime", file=sys.stdout)
        else:
            try:
                RPC.clear()
                print("\033[92m[INFO]:\033[00m \033[33mStopped RPC\033[00m", file=sys.stdout)
            except Exception:
                print("\033[91m[ERROR]:\033[00m Cant connect with Discord Gateway... Try reconnect automatically.")
                RPC.connect()

        response_data = jsonify({'processed': 'true'})
        return response_data
    return render_template('rpc_anime.html')
  
if __name__ =='__main__':  
    print("\033[92m[INFO]:\033[00m Connect to Discord RPC")
    RPC.connect()
    print("\033[92m[INFO]:\033[00m Start Flask server on port 8000")
    app.run(port=8000)
    print("\033[91m[STOPPED]:\033[00m Shutdown Server", file=sys.stdout)
    RPC.close()
    print("\033[91m[STOPPED]:\033[00m Closed connection to Discord Gateway", file=sys.stdout)