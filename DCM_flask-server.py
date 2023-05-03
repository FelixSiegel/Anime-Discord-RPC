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
import socket

PORT = 8000
APPLICATION_IDs = {
    'aniworld': '1020359247059497071',
    'crunchyroll': '1076049094281277531'
}

app = Flask(__name__)
CORS(app, resources={r"/rpc_anime": {"origins": "*"}})
shutdown = False


@app.route('/')
def home():
    return render_template('home.html')


@app.route('/rpc')
def rpc_default():
    return render_template('rpc_default.html')


@app.route('/rpc_anime', methods=['POST', 'GET'])
def rpc_anime():
    if request.method == "POST":
        print("\033[92m[INFO]:\033[00m Getting datas from rpc_anime.html")
        result = request.get_json()

        if result["type"] == "update":
            # args include all parameter for the rpc.update()-Function
            args = [
                result["host"],
                f"{result['host']} logo",
                result["details"], result["state"],
                int(time.time())]
            args.append(
                None if result["anilist"] == "" else [
                    {"label": "My AniList", "url": result["anilist"]}]
            )

            if result["host"] == "aniworld":
                rpc_aniworld.update(large_image=args[0], large_text=args[1], 
                                    details=args[2], state=args[3], start=args[4], buttons=args[5])
                print(f"\033[92m[INFO]:\033[00m Started Disord RPC with {result['host']}")
                # clear possible open connection to crunchyroll-application
                rpc_crunchy.clear()
            elif result["host"] == "crunchyroll":
                rpc_crunchy.update(large_image=args[0], large_text=args[1],
                                   details=args[2], state=args[3], start=args[4], buttons=args[5])
                print(f"\033[92m[INFO]:\033[00m Started Disord RPC with {result['host']}")
                # clear possible open connection to aniworld-application
                rpc_aniworld.clear()
            else:
                print(f"\033[91m[ERROR]:\033[00m No valid Host: {result['host']}")

        elif result["type"] == "clear":
            try:
                rpc_aniworld.clear()
                rpc_crunchy.clear()
                print("\033[92m[INFO]:\033[00m \033[33mStopped RPC\033[00m")
            except Exception:
                print("\033[91m[ERROR]:\033[00m No connection to Discord Gateway... Try reconnect automatically.")
                rpc_aniworld.connect()
                rpc_crunchy.connect()
        else: 
            print("\033[91m[ERROR]:\033[00m No valid type was given in json from request")
            return jsonify({'processed': 'false'})

        return jsonify({'processed': 'true'})
    return render_template('rpc_anime.html')

# Shutdown Flask Server -> Solution worked fine found here
# https://stackoverflow.com/questions/15562446/how-to-stop-flask-application-without-using-ctrl-c#answer-69812984
@app.route("/exit")
def exit_app():
    global shutdown
    shutdown = True
    return "Shutdown..."

@app.teardown_request
def teardown(_):
    import os
    if shutdown:
        print("\033[91m[STOPPED]:\033[00m Shutdown Server")
        os._exit(0)

# Function to check if port is already in use
def check_port(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0
    
# Function logging errors from pypresence
async def log_error(exception: Exception, future):
    print(f"\033[91m[ERROR]:\033[00m Exception occured in PyPresence: ")
    print(f"\n>>> {exception}\n")
    # Set the result of the future to indicate that the exception has been handled.
    future.set_result(None)

# init Presence-Objects
rpc_aniworld = Presence(APPLICATION_IDs['aniworld'])#, handler=log_error)
rpc_crunchy = Presence(APPLICATION_IDs['crunchyroll'])#, handler=log_error)

if __name__ == '__main__':
    if check_port(PORT):
        print(f"\033[91m[ERROR]:\033[00m Port {PORT} is already in use")
        sys.exit(1)

    print("\033[92m[INFO]:\033[00m Connect to Discord RPC")
    rpc_aniworld.connect()
    rpc_crunchy.connect()

    print("\033[92m[INFO]:\033[00m Start Flask server on port 8000")
    app.run(port=PORT)
    print("\033[91m[STOPPED]:\033[00m Shutdown Server")

    rpc_aniworld.close()
    rpc_crunchy.close()
    print("\033[91m[STOPPED]:\033[00m Closed connection to Discord Gateway")
