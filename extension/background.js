/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/

browser.runtime.onMessage.addListener(async (data, _sender, _sendResponse) => {
    console.info("Command of received data: ", data.cmd);

    if (data.cmd === 'check') {
        const tabs = await browser.tabs.query({ active: true, windowId: browser.windows.WINDOW_ID_CURRENT });
        const tab = await browser.tabs.get(tabs[0].id);

        return new Promise((resolve, _reject) => {
            resolve(tab.audible);
        });
    }

    else if (data.cmd === 'update') {
        const storage = await browser.storage.local.get();

        // check if auto_streamsync is enabled -> if not use storage value
        let stream_sync = storage.auto_streamsync;
        if (stream_sync === undefined) {
            await browser.storage.local.set({ "auto_streamsync": "enabled" });
            stream_sync = "enabled";
        }

        let hostname = storage.hostname;
        if (hostname === undefined) {
            await browser.storage.local.set({ "hostname": "crunchyroll" });
            hostname = "crunchyroll";
        }

        // if auto steamsync is disabled use selected host from user
        if (stream_sync === 'disabled') { data.args.host = hostname; }

        // if rpc logo is enabled -> query cover image
        let rpc_logo = storage.rpc_logo;
        if (rpc_logo === undefined) {
            await browser.storage.local.set({ "rpc_logo": "enabled" });
            rpc_logo = "enabled";
        }


        if (rpc_logo === 'enabled') {
            let resp;
            try {
                resp = await fetch(`https://graphql.anilist.co`, {
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
                            title: data.args.details
                        }
                    })
                })
            } catch (error) {
                console.error('Error fetching cover image: ', error);
                return;
            }
            if (resp.status !== 200 || resp.ok !== true) {
                console.error(`Error fetching cover image: (Status: ${resp.status} | OK: ${resp.ok})`);
                return;
            }
            const resp_obj = await resp.json();

            if (resp_obj?.data?.Media?.coverImage?.large) {
                data.args.large_image = resp_obj.data.Media.coverImage.large;

                // if rpc small image is enabled -> use host logo as small image
                let small_image = storage.rpc_smallimage;
                console.log("Small image: ", small_image);
                if (small_image === undefined) {
                    await browser.storage.local.set({ "rpc_smallimage": "enabled" });
                    small_image = "enabled";
                }
                if (small_image === 'enabled') {
                    data.args.small_image = "true";
                }
            }
        }

        console.info("Args: ", data.args);
        updateRPC(data.args);
    }

    else if (data.cmd === 'clear') {
        clearRPC();
    }
});

// function for updating Presence
function updateRPC(data) {
    fetch("http://127.0.0.1:8000/rpc_anime", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(
        (response) => {
            console.log("Responded data: ", response)
        }
    )
}

// function for clearing Presence
function clearRPC() {
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
        (response) => {
            console.log("Responded data: ", response)
        }
    )
}