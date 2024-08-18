let wasAudibleBefore = false

/**
 * Handles communication with the background script to update or clear the status of media playback.
 *
 * This function checks the current browser tab audible state and, based on the state before, either updates
 * the media playback status via a background script or clears it if the audio has stopped.
 * This is necessary because the content script does not have permission to access the browser's `tabs` API,
 * which is required to check if a tab is audible.
 *
 * @param {string} host - The media host, such as "aniworld" or "crunchyroll".
 * @param {string} anime - The title of the anime currently being watched.
 * @param {string} episode_details - The details of the current episode or progress of the anime.
 *
 * @returns {Promise<void>} - A promise that resolves when the function has completed its operations.
 *
 * @example
 * communicateToBackground("aniworld", "My Hero Academia", "Episode 1 of 13, Season 1");
 *
 * @example
 * communicateToBackground("crunchyroll", "Attack on Titan", "Episode 1");
 */
async function communicateToBackground(host, anime, episode_details) {
    try {
        const response = await browser.runtime.sendMessage({ cmd: "check" });
        console.info("Playing_state: ", response);

        if (response && !wasAudibleBefore) {
            const { anilist: anilist_url = "" } = await browser.storage.local.get("anilist");
            const { activity_type = "watching" } = await browser.storage.local.get("activity_type");

            const messageArgs = {
                cmd: "update",
                args: {
                    type: "update",
                    host: host,
                    details: anime,
                    state: episode_details,
                    anilist: anilist_url,
                    activity_type: activity_type
                }
            };

            await browser.runtime.sendMessage(messageArgs);
        } else if (!response && wasAudibleBefore) {
            await browser.runtime.sendMessage({ cmd: "clear" });
        }

        wasAudibleBefore = response;
    } catch (error) {
        console.error("Failed to communicate with the background script:", error);
    }
}

/**
 * Continuously checks if the current anime is playing and sends the details to the background script using
 * the `communicateToBackground` function. If auto rpc is disabled nothing will happen.
 *
 * @param {string} host - The host of the anime.
 * @param {string} anime - The name of the anime.
 * @param {string} episode_details - The details of the episode.
 *
 * @returns {void}
 *
 * @example
 * checkAnimePlaying("aniworld", "My Hero Academia", "Episode 1 of 13, Season 1");
 */
async function checkAnimePlaying(host, anime, episode_details) {
    const checkAutoRpcStatus = async () => {
        try {
            let { auto_rpc } = await browser.storage.local.get('auto_rpc');
            if (auto_rpc === undefined) {
                await browser.storage.local.set({ "auto_rpc": "enabled" });
                auto_rpc = "enabled";
            }
            return auto_rpc;
        } catch (err) {
            console.error("Failed to check auto_rpc status:", err);
            return null;
        }
    }

    setInterval(async () => {
        const autoRpcStatus = await checkAutoRpcStatus();
        if (autoRpcStatus === 'enabled') {
            await communicateToBackground(host, anime, episode_details);
        }
    }, 5000);
}

/**
 * Waits for an element matching the given selector to be added to the DOM and then calls
 * the callback function with the element.
 *
 * @param {string} selector - The CSS selector to match the element.
 * @param {function} callback - The callback function to be called with the matched element.
 *
 * @returns {void}
 *
 * @example
 * waitElement(".my-element", (element) => {
 *    console.log("Element added to the DOM:", element);
 * });
 */
function waitElement(selector, callback) {
    const observer = new MutationObserver((mutations, obs) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                const element = mutation.target.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    callback(element);
                    return;
                }
            }
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}

window.onload = async () => {
    switch (document.location.host) {
        case 'aniworld.to': {
            if (!document.querySelector(".inSiteWebStream")) return;

            const infos = document.querySelector(".hosterSiteTitle");
            const anime = document.querySelector(".series-title").children[0].innerText;
            let details;

            // Film selected:
            if (infos.getAttribute("data-season") === '0') {
                // TODO: Add support for films
            }

            // Season selected:
            else {
                const season = infos.getAttribute("data-season");
                const cur_ep = document.querySelector(".active").innerText;
                const tot_ep = document.querySelector(".active").parentElement.parentElement.childElementCount - 1;

                console.log("Anime: ", anime);
                console.log("Season: ", season);
                console.log("Current Episode: ", cur_ep);
                console.log("Total Episodes: ", tot_ep);

                // save data to local-storage for sync-functionality (popup)
                await browser.storage.local.set({
                    "latest_stream": {
                        "anime": anime,
                        "current_episode": cur_ep,
                        "total_episodes": tot_ep,
                        "season": season
                    }
                })

                details = `Episode ${cur_ep} of ${tot_ep} (Season ${season})`;
            }

            checkAnimePlaying("aniworld", anime, details);
            break;
        }
        case 'www.crunchyroll.com': {
            waitElement('.erc-current-media-info', async (infobox) => {
                const anime = document.querySelector("a.show-title-link")?.innerText || "Unknown Anime";
                const details = infobox.querySelector("h1.title")?.innerText || "Unknown episode";

                console.log("Anime: ", anime);
                console.log("Episode: ", details);

                // save data to local-storage for sync-functionality (popup)
                await browser.storage.local.set({
                    "latest_stream": {
                        "anime": anime,
                        "current_episode": "",
                        "total_episodes": "",
                        "season": ""
                    }
                })

                checkAnimePlaying("crunchyroll", anime, details);
            });
            break;
        }
    }
}

window.onbeforeunload = () => {
    browser.storage.local.get('auto_rpc').then(
        async (item) => {
            if (item.auto_rpc === undefined) {
                await browser.storage.local.set({ "auto_rpc": "enabled" })
                item.auto_rpc = 'enabled';
            }

            if (item.auto_rpc === 'enabled') {
                await browser.runtime.sendMessage({ "cmd": "clear" })
            }
        }
    )
}