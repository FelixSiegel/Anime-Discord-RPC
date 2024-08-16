console.log("Hello from the popup.js");

// Functions for updating the rpc preview

/**
 * Update anime name input field in the live rpc preview. If no state is set, the anime name field will be blank and
 * the cover image will be hidden. If a state is set, the anime name field will be set to "Watching {state}" and the
 * cover image will be fetched from anilist if the rpc_logo setting is enabled in the storage.
 *
 * @param {String} state - Value of the anime name input field
 * @param {Number} timeout - Timeout in milliseconds to wait before fetching the cover image. Used to prevent too many requests to the anilist API and to wait for the user to finish typing.
 *
 * @returns {void}
 **/
function update_anime_state(state, timeout = 800) {
    // of no state is set -> set anime name field to blank and hide cover image (show only stream host cover)
    if (state === '') {
        document.getElementById("anime_value").innerText = "";
        document.getElementById("cover_image").src = "";
        document.getElementById("cover_image").classList.add("hidden");
        browser.storage.local.get('hostname').then((item) => {
            if (item.hostname === 'aniworld') {
                document.getElementById("aniworld_logo").classList.remove("hidden");
            } else {
                document.getElementById("crunchyroll_logo").classList.remove("hidden");
            }

        }).catch(storage_err)
    } else {
        document.getElementById("anime_value").innerText = "Watching " + state;

        browser.storage.local.get('rpc_logo').then((item) => {
            if (item.rpc_logo !== 'enabled') { return; }

            // try fetch cover image from anilist
            // to prevent too many requests -> set timeout (to wait for user to finish typing)
            let cover_img = document.getElementById("cover_image")
            let timeout_id = cover_img.getAttribute("data-timeoutid")
            if (timeout_id) { clearTimeout(timeout_id) }

            timeout_id = setTimeout(() => {

                const assets = document.querySelectorAll(".asset");
                assets.forEach(el => { el.classList.add("dimmed") });

                const loader = document.getElementById("cover_loader");
                loader.classList.remove("hidden");

                fetch(`https://graphql.anilist.co`, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        query: `query ($title: String) {
                            Media(search: $title, type: ANIME) {
                                coverImage {
                                    large
                                }
                            }
                        }`,
                        variables: {
                            title: state
                        }
                    })
                }).then(
                    response => {
                        if (response.ok === true && response.status === 200) { return response.json() }
                        else { throw new Error(`Request status is not ok (Status: ${response.status} | OK: ${response.ok})`) }
                    }
                ).then(
                    data => {
                        if (data?.data?.Media?.coverImage?.large) {
                            cover_img.src = data.data.Media.coverImage.large;
                            cover_img.onload = () => {
                                assets.forEach(el => {
                                    el.classList.remove("dimmed");
                                    el.classList.add("hidden");
                                });
                                loader.classList.add("hidden");
                                cover_img.classList.remove("hidden");
                            }
                        }
                    }
                ).catch(
                    err => {
                        console.error("Error when fetching cover image: ", err.message);
                        show_message("error loading cover!", "red");
                        update_anime_state("");
                        assets.forEach(el => {
                            el.classList.remove("dimmed");
                            el.classList.add("hidden");
                        });
                        loader.classList.add("hidden");
                    }
                )
            }, timeout);

            cover_img.setAttribute("data-timeoutid", timeout_id.toString())
        }).catch(storage_err)
    }
}

/**
 * Update season input field in the live rpc preview
 *
 * @param {String} state - Value of the season input field
 * @returns {void}
 **/
function update_season_inp(state) {
    // if no season is set -> don't show season progress
    if (state === '') {
        document.getElementById("season_value").innerText = "";
    }
    // if also progress is set (aka episode) -> show season progress with separator
    else if (document.getElementById("progress_value").innerText) {
        document.getElementById("season_value").innerText = `, Season ${state}`
    }
    // if only season given -> show season
    else {
        document.getElementById("season_value").innerText = `Season ${state}`
    }
}

/**
 * Update episode input field in the live rpc preview
 *
 * @returns {void}
 **/
function update_episode_inp() {
    const cur = document.getElementById("cur_ep_inp").value;
    const total = document.getElementById("total_ep_inp").value;

    // if no current episode is set -> dont show episode progress
    if (cur === '') {
        document.getElementById("progress_value").innerText = "";
    }
    // if also total is given
    else if (total) {
        document.getElementById("progress_value").innerText = `Episode (${cur} of ${total})`
    }
    // if only cur given
    else {
        document.getElementById("progress_value").innerText = `Episode ${cur}`
    }
    update_season_inp(document.getElementById("cur_season_inp").value)
}

/**
 * Update discord display or username in the rpc preview
 *
 * @param {String} type - Type of the discord name to update. Can be "display_name" or "user_name". Default to "user_name".
 * @param {String} value - Value of the discord name to update the rpc preview with. Default to "phibiscool".
 * @returns {void}
 */
function update_discord_name(type, value) {
    switch (type) {
        case "display_name":
            value = value ? value : "PhiBi";
            browser.storage.local.set({ "dc_dname": value })
                .then(() => storage_log("dc_dname", value))
                .catch(storage_err);
            document.getElementById("dc_dname_inp").value = value;
            document.getElementById("displayname").innerText = value;
            break;
        case "user_name":
        default:
            value = value ? value : "phibiscool";
            browser.storage.local.set({ "dc_uname": value })
                .then(() => storage_log("dc_uname", value))
                .catch(storage_err);
            document.getElementById("dc_uname_inp").value = value;
            document.getElementById("username").innerText = value;
            break;
    }
}


// Functions for menu control functionality

/**
 * Function to toggle the visibility of the host selection menu.
 *
 * @param {Event|null} _event - Click event to trigger the function. Can be null if the function is called without an event.
 * @param {Boolean} force_close - If true, the host selection menu will be closed regardless of the current state.
 * @returns {void}
 */
function toggle_host_selection(_event, force_close = false) {
    const host_selection = document.getElementById("stream_hosts");
    if (force_close) { host_selection.classList.add("hidden"); return; }
    host_selection.classList.toggle("hidden");
}

/**
 * Function to change the current host for the rpc. If the function is called by a click event, the host will be changed
 * to the clicked element. If the function is called with the storage_update parameter set to true, the function will
 * set the default host to crunchyroll if no host is set in the local storage, else the host needs to be set in the
 * `element` parameter and the host selection menu will be updated accordingly.
 *
 * @param {Event|HTMLElement|null} element - Click event element to change the host to or HTMLElement loaded from storage
 * @param {Boolean} storage_update - If true, the function will
 */
function change_host(element, storage_update = false) {
    if (storage_update && !element) {
        // if no host is provided in local-storage -> set crunchyroll as default
        browser.storage.local.set({ "hostname": "crunchyroll" })
            .then(() => storage_log("hostname", "crunchyroll"))
            .catch(storage_err);
        document.getElementById("host_name").innerText = "Crunchyroll";

        // no need to update style, as crunchyroll is set as default in the rpc preview
        return;
    }

    element = storage_update ? element : element.target;

    document.getElementById("cur_host").innerText = element.innerText;
    document.getElementById("host_name").innerText = element.innerText;
    browser.storage.local.set({ "hostname": element.id })
        .then(() => storage_log("hostname", element.id))
        .catch(storage_err);

    document.querySelector(".item-selected").classList.remove("item-selected")
    element.classList.add("item-selected");

    // if no cover image -> set logo of the selected host as cover
    if (!document.getElementById("cover_image").src.startsWith("https://")) {
        document.querySelectorAll("#asset_holder img").forEach(el => {
            if (el.id === `${element.innerText.toLowerCase()}_logo`) { el.classList.remove("hidden") }
            else { el.classList.add("hidden") }
        });
    }
    toggle_host_selection(null, true);
}

/**
 * Change style of checkbox to enabled
 *
 * @param {String} id - HTML-ID of the checkbox to enable
 * @returns {void}
 */
function enable_checkbox(id) {
    const box = document.getElementById(id);
    box.style.backgroundColor = "#5865f2";
    box.style.borderColor = "#5865f2";
    box.innerHTML = `<img src="images/icons/check.svg" width="20px" height="20px" alt="x">`
}

/**
 * Change style of checkbox to disabled
 *
 * @param {String} id - HTML-ID of the checkbox to disable
 * @returns {void}
 */
function disable_checkbox(id) {
    const box = document.getElementById(id);
    box.style.backgroundColor = "#0000";
    box.style.borderColor = "#747f8d";
    box.innerHTML = "";
}

/**
 * Update checkbox style and save it to the local extension storage
 *
 * @param {String} checkbox HTML-ID of the checkbox to update
 * @param {string} [item="enabled"] - New state of the checkbox. Either "enabled" or "disabled". Default to "enabled".
 * @returns {void}
 */
function update_checkbox(checkbox, item = "enabled") {
    const storage_json = {};

    if (item !== 'enabled' && item !== 'disabled') {
        console.warn(`Invalid item value: ${item}. Set default to "enabled".`);
        item = "enabled";
    }

    // Change checkbox style
    if (item === 'enabled') {
        enable_checkbox(checkbox);
    } else if (item === 'disabled') {
        disable_checkbox(checkbox);
    }

    // Update storage
    storage_json[checkbox] = item;
    browser.storage.local.set(storage_json)
        .then(() => storage_log(checkbox, storage_json[checkbox]))
        .catch(storage_err);

}


// Helper functions to show important infos to the user and improve user experience

/**
 * Show info message to user in the popup. Automatically fades out after 2 seconds.
 *
 * @param {String} msg - Message to show
 * @param {String} color - Background color of the message. Can be any valid CSS color value.
 * @returns {void}
 **/
function show_message(msg, color) {
    // if message box is already in use -> remove current fade out timeout
    let timeout_id = document.getElementById("message").getAttribute("data-timeoutid");
    if (timeout_id) { clearTimeout(timeout_id) }

    // fade in message
    document.getElementById("message").innerText = msg;
    document.getElementById("message").style.backgroundColor = color;
    document.getElementById("message").style.opacity = "100%";

    // hide after 2 seconds
    timeout_id = setTimeout(() => {
        document.getElementById("message").style.opacity = "0%";
    }, 2000)
    document.getElementById("message").setAttribute("data-timeoutid", timeout_id.toString());
}

/**
 * Callback function for storage.get() errors. Used to inform the user about storage errors.
 *
 * @param {Error} err - Error object from the storage.get() promise
 * @returns {void}
 */
function storage_err(err) {
    // show error-message to popup.js
    show_message("storage error!", "red");
    // log error to console
    console.error(`[Storage Error] ${err}`);
}

/**
 * Function to log successful storage changes.
 *
 * @param {String} key - Key of the storage item that was changed
 * @param {String} value - New value of the storage item
 * @returns {void}
 */
function storage_log(key, value) {
    console.log(`[Storage Update] Set ${key} to: ${value}`);
}

/**
 * Check server status of the local flask server for rich presence connection and update status in the
 * server group section of the settings menu.
 *
 * @returns {void}
 */
function checkServerStatus() {
    fetch("http://127.0.0.1:8000/status", {
        method: "POST",
        headers: {
            'Accept': 'application/json'
        }
    }).then(
        response => {
            if (response.ok === true) { return response.json() }
            else { return response.statusText }
        }
    ).then(
        json => {
            console.log("Responded data: ", json)
            if (json.status === 'ok') {
                document.getElementById("status_img").src = "images/icons/correct.svg";
                document.getElementById("status_img").classList.remove("rotating");
                document.getElementById("server_status").innerText = "Server is running!";
                document.getElementById("server_status").style.color = "#5bb66c";
            }
        }
    ).catch(
        err => {
            console.error("Error when fetching to Server: ", err)
            document.getElementById("status_img").src = "images/icons/incorrect.svg";
            document.getElementById("status_img").classList.remove("rotating");
            document.getElementById("server_status").innerText = "Server can't be accessed!";
            document.getElementById("server_status").style.color = "red";
        }
    )
}


// Helper functions for updating the window with values from storage (mainly used to restore last session at startup)

/**
 * If value from storage is defined, the input field will be updated with the given value, otherwise it will keep the
 * current value. After updating the input field, the rpc preview will be updated with the input values.
 *
 * @param {String} element - HTML-ID of the input field to update
 * @param {String} value - Value from the storage to update the input field with
 * @returns {void}
 */
function update_from_storage(element, value) {
    if (value) { document.getElementById(element).value = value; }
    update_anime_state(document.getElementById("anime_input").value);
    update_episode_inp();
    update_season_inp(document.getElementById("cur_season_inp").value);
}

/**
 * Update the whole popup page with values from the storage. Useful to restore the last session at startup.
 */
function update_session() {
    browser.storage.local.get().then((item) => {
        change_host(document.getElementById(item.hostname), true);
        update_from_storage("anime_input", item.anime);
        update_from_storage("cur_ep_inp", item.current_episode);
        update_from_storage("total_ep_inp", item.total_episodes);
        update_from_storage("cur_season_inp", item.season);
        update_from_storage("anilist_link", item.anilist);
        update_checkbox("auto_rpc", item.auto_rpc);
        update_checkbox("rpc_logo", item.rpc_logo);
        update_checkbox("rpc_smallimage", item.rpc_details);
        update_checkbox("auto_streamsync", item.auto_streamsync);
        update_discord_name("display_name", item.dc_dname);
        update_discord_name("user_name", item.dc_uname);
    }).catch(storage_err)

    checkServerStatus();
}


// Apply typing event handlers to inputs of main-page

document.getElementById("anime_input").addEventListener("keyup", (e) => {
    browser.storage.local.set({ "anime": e.target.value })
        .then(() => storage_log("anime", e.target.value))
        .catch(storage_err);
    update_anime_state(e.target.value, 800);
})

document.getElementById("cur_season_inp").addEventListener("keyup", (e) => {
    browser.storage.local.set({ "season": e.target.value })
        .then(() => storage_log("season", e.target.value))
        .catch(storage_err);
    update_season_inp(e.target.value);
})

document.getElementById("cur_ep_inp").addEventListener("keyup", (e) => {
    browser.storage.local.set({ "current_episode": e.target.value })
        .then(() => storage_log("current_episode", e.target.value))
        .catch(storage_err);
    update_episode_inp();
})

document.getElementById("total_ep_inp").addEventListener("keyup", (e) => {
    browser.storage.local.set({ "total_episodes": e.target.value })
        .then(() => storage_log("total_episodes", e.target.value))
        .catch(storage_err);
    update_episode_inp();
})

document.getElementById("anilist_link").addEventListener("keyup", (e) => {
    browser.storage.local.set({ "anilist": e.target.value })
        .then(() => storage_log("anilist", e.target.value))
        .catch(storage_err);
})


// Apply typing event handlers to inputs of settings-page

document.getElementById("dc_dname_inp").addEventListener("keyup", (e) => {
    update_discord_name("display_name", e.target.value)
})

document.getElementById("dc_uname_inp").addEventListener("keyup", (e) => {
    update_discord_name("user_name", e.target.value)
})


// Apply click event handlers to buttons of main-page

document.getElementById("stop_btn").addEventListener("click", () => {
    const data = {
        "type": "clear"
    }

    fetch("http://127.0.0.1:8000/rpc_anime", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(
        response => {
            if (response.ok === true) { return response.json() }
            else { return response.statusText }
        }
    ).then(
        json => {
            console.log("Responded data: ", json)
            if (typeof json === 'string' || json instanceof String) {
                // Error from Request (like Internal Server Error)
                show_message(json, "red");
            } else if (json["processed"] === 'true') {
                // if Process is true -> request was successful
                show_message("Stopped!", "#5865f2");
            } else {
                // Process is false (not true)
                show_message("invalid request!", "red");
            }
        }
    ).catch(
        err => {
            console.error("Error when fetching to Server: ", err)
            show_message("requesting server failed!", "red")
        }
    )
})

document.getElementById("sync_btn").addEventListener("click", () => {
    browser.storage.local.get('latest_stream').then(
        (item) => {
            // if item is empty
            if (Object.keys(item).length === 0) {
                show_message("no data available!", "red");
            }
            else {
                const stream_data = item.latest_stream;
                browser.storage.local.set({ 'anime': stream_data.anime })
                    .then(() => storage_log("anime", stream_data.anime))
                    .catch(storage_err);
                browser.storage.local.set({ 'current_episode': stream_data.current_episode })
                    .then(() => storage_log("current_episode", stream_data.current_episode))
                    .catch(storage_err);
                browser.storage.local.set({ 'total_episodes': stream_data.total_episodes })
                    .then(() => storage_log("total_episodes", stream_data.total_episodes))
                    .catch(storage_err);
                browser.storage.local.set({ 'season': stream_data.season })
                    .then(() => storage_log("season", stream_data.season))
                    .catch(storage_err);
                update_session();
                show_message("Synced!", "#5865f2");
            }
        }
    ).catch(storage_err)
})

document.getElementById("update_btn").addEventListener("click", () => {
    console.log("update")
    const data = {
        "type": "update",
        "host": document.getElementById("host_name").innerText.toLowerCase(),
        "details": document.getElementById("anime_value").innerText,
        "state": document.getElementById("progress").innerText.replace("\n", ""),
        "anilist": document.getElementById("anilist_link").value
    }

    if (document.getElementById("cover_image").src.startsWith('https://')) {
        data["large_image"] = document.getElementById("cover_image").src;
    }

    fetch("http://127.0.0.1:8000/rpc_anime", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(
        response => {
            if (response.ok === true) { return response.json() }
            else { return response.statusText }
        }
    ).then(
        json => {
            console.log("Responded data: ", json)
            if (typeof json === 'string' || json instanceof String) {
                // Error from Request (like Internal Server Error)
                show_message(json, "red")
            } else if (json["processed"] === 'true') {
                // if Process is true -> request was successful
                show_message("Updated!", "#5865f2")
            } else {
                // Process is false (not true)
                show_message("invalid request!", "red")
            }
        }
    ).catch(
        err => {
            console.error("Error when fetching to Server: ", err)
            show_message("requesting server failed!", "red")
        }
    )
})


// Apply click event handlers for the checkboxes

document.getElementById("auto_rpc").addEventListener("click", () => {
    browser.storage.local.get('auto_rpc').then(
        (item) => {
            console.log(`auto_rpc in localstorage was changed. Value before: ${item.auto_rpc}`)
            if (item.auto_rpc === 'enabled') { update_checkbox("auto_rpc", "disabled") }
            else { update_checkbox("auto_rpc", "enabled") }
        }
    ).catch(storage_err)
})

document.getElementById("auto_streamsync").addEventListener("click", () => {
    browser.storage.local.get('auto_streamsync').then(
        (item) => {
            console.log(`auto_streamsync in localstorage was changed. Value before: ${item.auto_streamsync}`)
            if (item.auto_streamsync === 'enabled') { update_checkbox("auto_streamsync", "disabled") }
            else { update_checkbox("auto_streamsync", "enabled") }
        }
    ).catch(storage_err)
})

document.getElementById("rpc_logo").addEventListener("click", () => {
    browser.storage.local.get('rpc_logo').then(
        (item) => {
            console.log(`rpc_logo in localstorage was changed. Value before: ${item.rpc_logo}`)
            if (item.rpc_logo === 'enabled') {
                update_checkbox("rpc_logo", "disabled");
                document.getElementById("cover_image").src = "";
                document.querySelectorAll("#asset_holder img").forEach(el => {
                    if (el.id === `${document.getElementById("cur_host").innerText.toLowerCase()}_logo`) {
                        el.classList.remove("hidden");
                    }
                    else { el.classList.add("hidden"); }
                });
            }
            else {
                update_checkbox("rpc_logo", "enabled");
                update_anime_state(document.getElementById("anime_input").value);
            }
        }
    ).catch(storage_err)
});

document.getElementById("rpc_smallimage").addEventListener("click", () => {
    browser.storage.local.get('rpc_smallimage').then(
        (item) => {
            console.log(`rpc_smallimage in localstorage was changed. Value before: ${item.rpc_smallimage}`)
            if (item.rpc_smallimage === 'enabled') { update_checkbox("rpc_smallimage", "disabled") }
            else { update_checkbox("rpc_smallimage", "enabled") }
        }
    ).catch(storage_err)
});


// Apply event handlers for menu control

document.getElementById("open_host").addEventListener("click", toggle_host_selection)
document.getElementById("aniworld").addEventListener("click", change_host)
document.getElementById("crunchyroll").addEventListener("click", change_host)

document.getElementById("settingsicon").addEventListener("click", () => {
    document.getElementById("mainwindow").style.width = "0px";
    document.getElementById("mainwindow").style.opacity = "0%";
})

document.getElementById("arrow_back").addEventListener("click", () => {
    document.getElementById("mainwindow").style.width = "325px";
    document.getElementById("mainwindow").style.opacity = "100%";
})

document.querySelectorAll(".group-title").forEach(group => {
    group.addEventListener("click", (element) => {
        element.target.classList.toggle("group-active");
        const content = element.target.parentElement.children[1];
        if (content.style.maxHeight) {
            content.style.maxHeight = null;
            content.style.opacity = "0%";
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
            content.style.opacity = "100%";
        }
    })
})

document.getElementById("check_status").addEventListener("click", checkServerStatus)
document.getElementById("shutdown_btn").addEventListener("click", () => {
    fetch("http://127.0.0.1:8000/exit").then(() => { checkServerStatus() })
        .catch(() => { checkServerStatus() })
})


window.onload = update_session;
