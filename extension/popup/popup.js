console.log("Hello from the popup.js");

function update_anime_state(state) {
    if (state=="") {document.getElementById("anime_value").innerText = ""}
    else {document.getElementById("anime_value").innerText = "Watching " + state}
    return
}
function update_season_inp(state) {
    if (state == "") {document.getElementById("season_value").innerText = "";return}
    if (document.getElementById("progress_value").innerText) {
        document.getElementById("season_value").innerText = `, Season ${state}`
    }
    else {document.getElementById("season_value").innerText = `Season ${state}`}
    return;
}
function update_episode_inp() {
    cur = document.getElementById("cur_ep_inp").value;
    total = document.getElementById("total_ep_inp").value;
    // if no current episode is set -> dont show episode progress
    if (cur == "") {
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
    return;
}

// apply typing eventhandlers to inputs
document.getElementById("anime_input").addEventListener("keyup", (e)=>{
    browser.storage.local.set({"anime": e.target.value})
    update_anime_state(e.target.value);
})
document.getElementById("cur_season_inp").addEventListener("keyup", (e)=>{
    browser.storage.local.set({"season": e.target.value})
    update_season_inp(e.target.value);
})
document.getElementById("cur_ep_inp").addEventListener("keyup", (e)=>{
    browser.storage.local.set({"curepisode": e.target.value})
    update_episode_inp();
})
document.getElementById("total_ep_inp").addEventListener("keyup", (e)=>{
    browser.storage.local.set({"totepisode": e.target.value})
    update_episode_inp();
})
document.getElementById("anilist_link").addEventListener("keyup", (e)=>{
    browser.storage.local.set({"anilist": e.target.value})
})

function update_from_storage(value, item) {
    if (item != undefined) {
        document.getElementById(value).value = item;
    }
    update_anime_state(document.getElementById("anime_input").value);
    update_episode_inp();
    update_season_inp(document.getElementById("cur_season_inp").value);
}

function show_message(msg, color) {
    // fade in message
    document.getElementById("message").innerText = msg;
    document.getElementById("message").style.backgroundColor = color;
    document.getElementById("message").style.opacity = "100%"
    // hide after 2 seconds
    setTimeout( () => {
        document.getElementById("message").style.opacity = "0%"
    }, 2000)
}

function storage_err(err) {
    // show error-message to popup.js
    show_message("Storage Error", "red")
    // log error to console
    console.error(`[popup.js] Storage-Error: ${err}`)
}

function update_session() {
    browser.storage.local.get('hostname').then((item)=>{change_host(document.getElementById(item.hostname), storage_update=true)}, storage_err)
    browser.storage.local.get('anime').then((item)=>{update_from_storage("anime_input", item.anime)}, storage_err)
    browser.storage.local.get('curepisode').then((item)=>{update_from_storage("cur_ep_inp", item.curepisode)}, storage_err)
    browser.storage.local.get('totepisode').then((item)=>{update_from_storage("total_ep_inp", item.totepisode)}, storage_err)
    browser.storage.local.get('season').then((item)=>{update_from_storage("cur_season_inp", item.season)}, storage_err)
    browser.storage.local.get('anilist').then((item)=>{update_from_storage("anilist_link", item.anilist)}, storage_err)
}

// update rpc with values from input (maybe last session values)
window.onload = update_session

// Button event handling

document.getElementById("stop_btn").addEventListener("click", ()=>{
    datas = { 
        "type": "clear"
    }

    fetch("http://127.0.0.1:8000/rpc_anime", {
        method: "POST", 
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify( datas )
    }).then(
        (response) => {
            console.log("Responsed data: ", response)
            // TODO: check if response is correct or errormessage
            show_message("Stopped RPC!", "#5865f2")
        }
    )
})


// Function for sync data from current stream with data from local-storage
document.getElementById("sync_btn").addEventListener("click", ()=>{
    browser.storage.local.get('cur_stream_data').then(
        (item) => {
            // if item is empty
            if (Object.keys(item).length === 0) {
                show_message("No Data available", "red")
            }
            else {
                stream_data = item.cur_stream_data
                browser.storage.local.set({'anime': stream_data.anime})
                browser.storage.local.set({'curepisode': stream_data.cur_ep})
                browser.storage.local.set({'totepisode': stream_data.tot_ep})
                browser.storage.local.set({'season': stream_data.season})
                update_session()
                show_message("Synced!", "#5865f2")
            }
        },
        storage_err
    )
}) 

document.getElementById("update_btn").addEventListener("click", ()=>{
    console.log("update")
    datas = { 
        "type": "update",
        "host": document.getElementById("host_name").innerText.toLowerCase(), 
        "details": document.getElementById("anime_value").innerText, 
        "state": document.getElementById("progress").innerText.replace("\n", ""),
        "anilist": document.getElementById("anilist_link").value
    }

    fetch("http://127.0.0.1:8000/rpc_anime", {
        method: "POST", 
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify( datas )
    }).then(
        (response) => {
            console.log("Responsed data: ", response)
            // TODO: check for error on request
            show_message("Updated!", "#5865f2")
        }
    )
})


// Function for open/close functionallity of stream host selection
function open_hosts_selection(close=false) {
    el = document.getElementById("stream_hosts");
    if (close==true) {el.style.display = "none";return;}
    switch (getComputedStyle(el).display) {
        case "none":
            el.style.display = "block";
            break;
        case "block":
            el.style.display = "none";
            break;
    }
}

document.getElementById("open_host").addEventListener("click", open_hosts_selection)

// Function for change host after select a new value
function change_host(e, storage_update=false) {
    if (storage_update) {
        if (e == null) {
            // if no host is provided in local-storage -> set host_ani as standart
            browser.storage.local.set({"hostname": "host_ani"})
            document.getElementById("host_name").innerText = "Aniworld"
            return;
        } 
    } else { e = e.target }
    // update
    document.getElementById("cur_host").innerText = e.innerText.replace(/\s/g, "");
    document.getElementById("host_name").innerText = e.innerText.replace(/\s/g, "");
    // save value to localStorage
    browser.storage.local.set({"hostname": e.id})
    // change cur selected style and close menu
    document.getElementsByClassName("item-selected")[0].classList.remove("item-selected")
    e.classList.add("item-selected");
    Array(...document.getElementById("asset_holder").children).forEach(el => {
        if (el.id == `${e.innerText.replace(/\s/g, "").toLocaleLowerCase()}_logo`) {el.style.display = "block"}
        else {el.style.display = "none"}
    });
    open_hosts_selection(close=true);
}

document.getElementById("host_ani").addEventListener("click", (e)=>{change_host(e)})
document.getElementById("host_crunchy").addEventListener("click", (e)=>{change_host(e)})
