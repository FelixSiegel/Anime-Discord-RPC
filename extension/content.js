window.onload = ()=>{
    console.log(document.location.host)
    if (document.location.host == "aniworld.to") {
        console.clear()
        console.log("inSiteWebStream: ", document.getElementsByClassName("inSiteWebStream"))
        streamBox = document.getElementsByClassName("inSiteWebStream")
        if (streamBox.length > 0) {
            infos = document.getElementsByClassName("hosterSiteTitle")[0]
            if (infos.getAttribute("data-season") != "0") { // if season is selected, not film
                var anime = document.getElementsByClassName("series-title")[0].children[0].innerText;
                    season = infos.getAttribute("data-season");
                    cur_ep = document.getElementsByClassName("active")[1].innerText;
                    max_ep = document.getElementsByClassName("active")[1].parentElement.parentElement.childElementCount -1;
                console.log("Anime: ", anime);console.log("Season: ", season);
                console.log("Cur Episode: ", cur_ep);console.log("Max Episode: ", max_ep);

                // save streaming data to local-storage for sync-function of popup.js
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
                let last_stand = false
                checkPlaying = setInterval(() => {
                    browser.runtime.sendMessage({"cmd": "check"})
                    .then((response) => {
                        console.info("Playing_state: ", response)
                        if (response==true && last_stand==false) {
                            browser.storage.local.get("anilist").then(
                                url => {
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
                }, 5000);
            }
        }
    }
}

window.onclose = () => {
    // if tab is close -> stop contingently running RPC
    browser.runtime.sendMessage({"cmd": "clear"})
}