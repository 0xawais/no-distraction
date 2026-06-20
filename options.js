document.addEventListener('DOMContentLoaded', () => {
    const siteListEl = document.getElementById('site-list');
    const newSiteInput = document.getElementById('new-site');
    const addBtn = document.getElementById('add-btn');
    const errorMsg = document.getElementById('error-message');

    // Modal elements
    const modal = document.getElementById('puzzle-modal');
    const modalEquation = document.getElementById('modal-equation');
    const modalAnswer = document.getElementById('modal-answer');
    const modalCancel = document.getElementById('modal-cancel');
    const modalSubmit = document.getElementById('modal-submit');
    const modalError = document.getElementById('modal-error-message');
    const removeSiteNameSpan = document.getElementById('remove-site-name');

    let currentSiteToRemove = null;
    let expectedAnswer = null;

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
            removeBtn.addEventListener('click', () => initiateRemoveSite(site));
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

    function initiateRemoveSite(site) {
        currentSiteToRemove = site;
        removeSiteNameSpan.textContent = site;
        generatePuzzle();
        modalError.textContent = '';
        modalAnswer.value = '';
        modal.classList.remove('hidden');
        setTimeout(() => modalAnswer.focus(), 100);
    }

    function generatePuzzle() {
        let a = Math.floor(Math.random() * 8) + 2;
        if (Math.random() > 0.5) a = -a;
        expectedAnswer = Math.floor(Math.random() * 20) - 10;
        let b = Math.floor(Math.random() * 20) - 10;
        let c = a * expectedAnswer + b;
        let equationStr = `${a}x`;
        if (b > 0) { equationStr += ` + ${b}`; }
        else if (b < 0) { equationStr += ` - ${Math.abs(b)}`; }
        equationStr += ` = ${c}`;
        modalEquation.textContent = equationStr;
    }

    function closeAndResetModal() {
        modal.classList.add('hidden');
        currentSiteToRemove = null;
        expectedAnswer = null;
        modalAnswer.value = '';
        modalError.textContent = '';
    }

    function verifyAndRemove() {
        if (!currentSiteToRemove) return;
        const userAnswer = parseInt(modalAnswer.value, 10);
        if (isNaN(userAnswer)) {
            modalError.textContent = 'Please enter a number.';
            return;
        }

        if (userAnswer === expectedAnswer) {
            chrome.storage.local.get(['blockedSites'], (result) => {
                let sites = result.blockedSites || [];
                sites = sites.filter(site => site !== currentSiteToRemove);
                chrome.storage.local.set({ blockedSites: sites }, () => {
                    renderSites(sites);
                    closeAndResetModal();
                });
            });
        } else {
            modalError.textContent = 'Incorrect. Try again!';
            modalAnswer.value = '';
            modalAnswer.focus();
        }
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        setTimeout(() => { if (errorMsg.textContent === msg) errorMsg.textContent = ''; }, 3000);
    }

    addBtn.addEventListener('click', addSite);
    newSiteInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addSite(); });

    modalCancel.addEventListener('click', closeAndResetModal);
    modalSubmit.addEventListener('click', verifyAndRemove);
    modalAnswer.addEventListener('keypress', (e) => { if (e.key === 'Enter') verifyAndRemove(); });

    // Close modal if clicked outside of content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAndResetModal();
        }
    });

    loadSites();
});