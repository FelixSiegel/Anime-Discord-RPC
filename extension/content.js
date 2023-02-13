window.onload = ()=>{
    console.log(document.location.host)
    if (document.location.host == "aniworld.to") {
        console.clear()
        console.log(document.getElementsByClassName("inSiteWebStream"))
        streamBox = document.getElementsByClassName("inSiteWebStream")
        if (streamBox.length > 0) {
            infos = document.getElementsByClassName("hosterSiteTitle")[0]
            if (infos.getAttribute("data-season") != "0") { // if season is selected, not film
                console.log("Anime: ", document.getElementsByClassName("series-title")[0].children[0].innerText)
                console.log("Season: ", infos.getAttribute("data-season"))
                console.log("Cur Episode: ", document.getElementsByClassName("active")[1].innerText)
                console.log("Max Episode: ", document.getElementsByClassName("active")[1].parentElement.parentElement.childElementCount -1)


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
                                            "details": document.getElementsByClassName("series-title")[0].children[0].innerText, 
                                            "state": `Episode (${document.getElementsByClassName("active")[1].innerText} of ${document.getElementsByClassName("active")[1].parentElement.parentElement.childElementCount -1}), Season ${document.getElementsByClassName("hosterSiteTitle")[0].getAttribute("data-season")}`,
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