#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Tue Sep 20 18:40:56 2022

@author: Revox179
"""

import sys
import time
import socket
import asyncio

from pypresence import Presence
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS

PORT = 8000
APPLICATION_IDs = {"aniworld": "1020359247059497071", "crunchyroll": "1076049094281277531"}

app = Flask(__name__)
CORS(app, resources={r"/rpc_anime": {"origins": "*"}})
CORS(app, resources={r"/status": {"origins": "*"}})

shutdown = False
rpc = None


@app.route("/")
def home():
    return render_template("home.html")


@app.route("/rpc")
def rpc_default():
    return render_template("rpc_default.html")


@app.route("/rpc_anime", methods=["POST", "GET"])
def rpc_anime():
    global rpc
    if request.method == "POST":
        result = request.get_json()

        if result["type"] == "update":
            print("\033[92m[INFO]:\033[00m Updating-Request received")
            # args include all parameter for the rpc.update()-Function
            args = {}
            args["host"] = result.get("host")
            args["details"] = result.get("details")
            args["state"] = result.get("state")
            args["start"] = int(time.time())

            # if provided, include image and text for large_image else use host as large_image
            if result.get("large_image"):
                args["large_image"] = result["large_image"]
                args["large_text"] = "Image by AniList"
            else:
                args["large_image"] = result.get("host")
                args["large_text"] = f"{result['host']} logo"

            # include AniList-Button if link is provided
            args["buttons"] = [{"label": "My AniList", "url": result["anilist"]}] if result.get("anilist") else None

            if rpc is not None:
                try:
                    rpc.clear()
                    rpc.close()
                    rpc = None
                    print(f"\033[92m[INFO]:\033[00m Closed connection to Disord RPC with {args['host']}")
                except Exception:
                    print("\033[91m[ERROR]:\033[00m No connection to Discord Gateway...")

            if args["host"] not in APPLICATION_IDs:
                print(f"\033[91m[ERROR]:\033[00m No valid Host: {result['host']}")
                return jsonify({"processed": "false"})

            elif not args["details"] and not args["state"]:
                print("\033[91m[ERROR]:\033[00m No valid Details or State provided")
                return jsonify({"processed": "false"})

            else:
                # create new event loop for rpc
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

                # start new rpc connection and update it with values from args
                rpc = Presence(APPLICATION_IDs[args["host"]], loop=loop)
                rpc.connect()
                print(f"\033[92m[INFO]:\033[00m Connected to Disord RPC with {args['host']}")
                rpc.update(
                    large_image=args["large_image"],
                    large_text=args["large_text"],
                    details=args["details"],
                    state=args["state"],
                    start=args["start"],
                    buttons=args["buttons"],
                )
                print(f"\033[92m[INFO]:\033[00m Started Disord RPC with {args['host']}")

        elif result["type"] == "clear":
            print("\033[92m[INFO]:\033[00m Clear-Request received")
            if rpc is not None:
                try:
                    rpc.clear()
                    rpc.close()
                    rpc = None
                    print("\033[92m[INFO]:\033[00m Closed connection to last Disord RPC connection")
                except Exception:
                    print("\033[91m[ERROR]:\033[00m No connection to Discord Gateway...")
            else:
                print("\033[92m[INFO]:\033[00m No known running RPC-Connection to close")
        else:
            print("\033[91m[ERROR]:\033[00m Request with no valid/known Type received")
            return jsonify({"processed": "false"})

        return jsonify({"processed": "true"})
    return render_template("rpc_anime.html")


# Route to check status of server from Firefox-Extension
@app.route("/status", methods=["POST"])
def status():
    return jsonify({"status": "ok"})


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


if __name__ == "__main__":
    if check_port(PORT):
        print(f"\033[91m[ERROR]:\033[00m Port {PORT} is already in use")
        sys.exit(1)

    print("\033[92m[INFO]:\033[00m Start Flask server on port 8000")
    app.run(port=PORT)
    print("\033[91m[STOPPED]:\033[00m Shutdown Server")
