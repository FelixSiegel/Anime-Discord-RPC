// wait for messages of content.js
browser.runtime.onMessage.addListener((data, _sender, sendResponse) => {
    console.info("Data: ", data.cmd)
    if (data.cmd == "check") {
        sendResponse(browser.tabs.query({ active: true, windowId: browser.windows.WINDOW_ID_CURRENT })
            .then(tabs => browser.tabs.get(tabs[0].id))
            .then(tab => { console.log(String(tab.audible)); return tab.audible }))
    } else if (data.cmd == "update") {
        console.info("Args: ", data.args)
        updateRPC(data.args)
    } else if (data.cmd == "clear") {
        clearRPC()
    }
});

// function for updating Presence
function updateRPC(datas) {
    fetch("http://127.0.0.1:8000/rpc_anime", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datas)
    }).then(
        (response) => {
            console.log("Responsed data: ", response)
        }
    )
}

// function for clearing Presence
function clearRPC() {
    datas = {
        "type": "clear"
    }

    fetch("http://127.0.0.1:8000/rpc_anime", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datas)
    }).then(
        (response) => {
            console.log("Responsed data: ", response)
        }
    )
}