document.addEventListener('DOMContentLoaded', () => {
    const siteListEl = document.getElementById('site-list');
    const newSiteInput = document.getElementById('new-site');
    const addBtn = document.getElementById('add-btn');
    const errorMsg = document.getElementById('error-message');
    function loadSites() {
        chrome.storage.local.get(['blockedSites'], (result) => { renderSites(result.blockedSites || []); });
    }
    function renderSites(sites) {
        siteListEl.innerHTML = '';
        sites.forEach(site => {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.textContent = site;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.className = 'remove-btn';
            removeBtn.addEventListener('click', () => removeSite(site));
            li.appendChild(span);
            li.appendChild(removeBtn);
            siteListEl.appendChild(li);
        });
    }
    function addSite() {
        let site = newSiteInput.value.trim().toLowerCase();
        if (!site) return showError("Please enter a site name.");
        site = site.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        chrome.storage.local.get(['blockedSites'], (result) => {
            const sites = result.blockedSites || [];
            if (sites.includes(site)) return showError("Site is already in the list.");
            sites.push(site);
            chrome.storage.local.set({ blockedSites: sites }, () => {
                newSiteInput.value = '';
                errorMsg.textContent = '';
                renderSites(sites);
            });
        });
    }
    function removeSite(siteToRemove) {
        chrome.storage.local.get(['blockedSites'], (result) => {
            let sites = result.blockedSites || [];
            sites = sites.filter(site => site !== siteToRemove);
            chrome.storage.local.set({ blockedSites: sites }, () => renderSites(sites));
        });
    }
    function showError(msg) {
        errorMsg.textContent = msg;
        setTimeout(() => { if (errorMsg.textContent === msg) errorMsg.textContent = ''; }, 3000);
    }
    addBtn.addEventListener('click', addSite);
    newSiteInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addSite(); });
    loadSites();
});