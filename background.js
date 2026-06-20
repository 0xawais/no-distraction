const DEFAULT_BLOCKED_SITES = ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'reddit.com', 'youtube.com', 'snapchat.com', 'pinterest.com', 'linkedin.com', 'tumblr.com'];
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['blockedSites', 'unlockedSites'], (result) => {
        if (!result.blockedSites) chrome.storage.local.set({ blockedSites: DEFAULT_BLOCKED_SITES });
        if (!result.unlockedSites) chrome.storage.local.set({ unlockedSites: {} });
    });
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