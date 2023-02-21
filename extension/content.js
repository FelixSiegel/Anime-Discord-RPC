var last_stand = false
function communicateToBackground(anime, cur_ep, max_ep, season) {
    // first send check-request to check if tab is audible
    browser.runtime.sendMessage({"cmd": "check"})
    .then((response) => {
        console.info("Playing_state: ", response)
        if (response==true && last_stand==false) {
            // if tab was audible and before not -> start rpc
            browser.storage.local.get("anilist").then(
                url => {
                    if (url.anilist == undefined) {url.anilist = ""}
                    // start RPC with current data when audio start
                    browser.runtime.sendMessage({
                        "cmd": "update", 
                        "args": { 
                            "type": "update",
                            "host": "aniworld", 
                            "details": anime, 
                            "state": `Episode (${cur_ep} of ${max_ep}), Season ${season}`,
                            "anilist": url.anilist
                        }
                    })
                }
            )
        } else if (response==false && last_stand==true) {
            // clear RPC when audio stopped
            browser.runtime.sendMessage({"cmd": "clear"})
        }
        last_stand = response;
    })
}

window.onload = ()=>{
    if (document.location.host == "aniworld.to") {
        console.clear()
        streamBox = document.getElementsByClassName("inSiteWebStream")
        if (streamBox.length > 0) {
            infos = document.getElementsByClassName("hosterSiteTitle")[0]
            if (infos.getAttribute("data-season") != "0") { // if season is selected, not film
                // get current stream data
                var anime = document.getElementsByClassName("series-title")[0].children[0].innerText;
                    season = infos.getAttribute("data-season");
                    cur_ep = document.getElementsByClassName("active")[1].innerText;
                    max_ep = document.getElementsByClassName("active")[1].parentElement.parentElement.childElementCount -1;

                console.log("Anime: ", anime);console.log("Season: ", season);
                console.log("Cur Episode: ", cur_ep);console.log("Max Episode: ", max_ep);

                // save current stream data to local-storage for sync-function from popup.js
                browser.storage.local.set(
                    {
                        "cur_stream_data": {
                            "anime": anime,
                            "cur_ep": cur_ep,
                            "tot_ep": max_ep,
                            "season": season
                        }
                    }
                )

                // check every 5 seconds if audio is playing
                checkPlaying = setInterval(() => {
                    // first check if auto_rpc is enabled
                    browser.storage.local.get('auto_rpc').then(
                        (item) => {
                            // if undefined -> set initial to enabled
                            if (item.auto_rpc == undefined) {
                                browser.storage.local.set({"auto_rpc": "enabled"})
                                item.auto_rpc = 'enabled'
                            }
                            // if enabled start requesting with background.js
                            if (item.auto_rpc == 'enabled') {communicateToBackground(anime, cur_ep, max_ep, season)}
                        }
                    )
                }, 5000);
            }
        }
    }
}

// if tab/window was closed stop RPC (only if auto_rpc is enabled)
window.onbeforeunload = () => {
    // first check if auto_rpc is enabled
    browser.storage.local.get('auto_rpc').then(
        (item) => {
            // if undefined -> set initial to enabled
            if (item.auto_rpc == undefined) {
                browser.storage.local.set({"auto_rpc": "enabled"})
                item.auto_rpc = 'enabled'
            }
            // if enabled start -> stop contingently running RPC
            if (item.auto_rpc == 'enabled') {browser.runtime.sendMessage({"cmd": "clear"})}
        }
    )
}