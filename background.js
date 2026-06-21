const DEFAULT_BLOCKED_SITES = ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'reddit.com', 'youtube.com', 'snapchat.com', 'pinterest.com', 'linkedin.com', 'tumblr.com'];
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['blockedSites', 'unlockedSites'], (result) => {
        if (!result.blockedSites) chrome.storage.local.set({ blockedSites: DEFAULT_BLOCKED_SITES });
        if (!result.unlockedSites) chrome.storage.local.set({ unlockedSites: {} });
    });
    // Create an alarm to check active tabs periodically (every minute)
    chrome.alarms.create('checkLocks', { periodInMinutes: 1 });
});

// Also trigger checks on every alarm interval
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'checkLocks') {
        await enforceLocks();
    }
});

// Function to proactively close/redirect open tabs that have expired
async function enforceLocks() {
    const result = await chrome.storage.local.get(['blockedSites', 'unlockedSites']);
    const blockedSites = result.blockedSites || DEFAULT_BLOCKED_SITES;
    let unlockedSites = result.unlockedSites || {};

    // First, clean up
    unlockedSites = await cleanUpUnlockedSites(unlockedSites);

    // Get all open tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        if (!tab.url) continue;
        try {
            const url = new URL(tab.url);
            if (url.protocol === 'chrome-extension:') continue;

            const hostname = url.hostname.toLowerCase();
            const matchedSite = blockedSites.find(site => hostname.includes(site));

            if (matchedSite) {
                // If it's blocked and NOT in unlockedSites (because it expired and was cleaned up, or was manually locked)
                if (!unlockedSites[matchedSite] || Date.now() > unlockedSites[matchedSite]) {
                    const puzzleUrl = chrome.runtime.getURL(`puzzle.html?target=${encodeURIComponent(tab.url)}&domain=${encodeURIComponent(matchedSite)}`);
                    chrome.tabs.update(tab.id, { url: puzzleUrl });
                }
            }
        } catch (e) {
            // Ignore invalid URLs
        }
    }
}

// We should also listen for manual lock events from options.js to enforce immediately
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.unlockedSites) {
        await enforceLocks();
    }
});

async function cleanUpUnlockedSites(unlockedSites) {
    const now = Date.now();
    let changed = false;
    for (const [domain, expiry] of Object.entries(unlockedSites)) {
        if (now > expiry) { delete unlockedSites[domain]; changed = true; }
    }
    if (changed) await chrome.storage.local.set({ unlockedSites });
    return unlockedSites;
}
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;
    try {
        const url = new URL(details.url);
        if (url.protocol === 'chrome-extension:') return;
        const hostname = url.hostname.toLowerCase();
        const result = await chrome.storage.local.get(['blockedSites', 'unlockedSites']);
        const blockedSites = result.blockedSites || DEFAULT_BLOCKED_SITES;
        let unlockedSites = result.unlockedSites || {};
        const isBlocked = blockedSites.some(site => hostname.includes(site));
        if (isBlocked) {
            const matchedSite = blockedSites.find(site => hostname.includes(site));
            unlockedSites = await cleanUpUnlockedSites(unlockedSites);
            if (!unlockedSites[matchedSite] || Date.now() > unlockedSites[matchedSite]) {
                const puzzleUrl = chrome.runtime.getURL(`puzzle.html?target=${encodeURIComponent(details.url)}&domain=${encodeURIComponent(matchedSite)}`);
                chrome.tabs.update(details.tabId, { url: puzzleUrl });
            }
        }
    } catch (e) { console.error("Error parsing URL:", e); }
});