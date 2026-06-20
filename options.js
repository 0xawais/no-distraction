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
    const lockAllBtn = document.getElementById('lock-all-btn');

    let currentSiteToRemove = null;
    let expectedAnswer = null;
    let timerInterval = null;

    function loadSites() {
        chrome.storage.local.get(['blockedSites', 'unlockedSites'], (result) => {
            renderSites(result.blockedSites || [], result.unlockedSites || {});
        });
    }

    function renderSites(sites, unlockedSites) {
        siteListEl.innerHTML = '';

        let hasUnlockedSites = false;
        const now = Date.now();

        sites.forEach(site => {
            const li = document.createElement('li');
            const leftContainer = document.createElement('div');
            leftContainer.style.display = 'flex';
            leftContainer.style.flexDirection = 'column';
            leftContainer.style.gap = '4px';

            const span = document.createElement('span');
            span.textContent = site;
            leftContainer.appendChild(span);

            const expiry = unlockedSites[site];
            const isUnlocked = expiry && expiry > now;

            if (isUnlocked) {
                hasUnlockedSites = true;
                const timerSpan = document.createElement('span');
                timerSpan.className = 'timer-span';
                timerSpan.style.fontSize = '0.85em';
                timerSpan.style.color = '#1976d2';
                timerSpan.dataset.expiry = expiry;
                timerSpan.dataset.site = site;
                leftContainer.appendChild(timerSpan);
                updateTimerDisplay(timerSpan, expiry);
            }

            const rightContainer = document.createElement('div');
            rightContainer.style.display = 'flex';
            rightContainer.style.gap = '10px';

            if (isUnlocked) {
                const lockBtn = document.createElement('button');
                lockBtn.textContent = 'Lock Now';
                lockBtn.style.backgroundColor = '#f57c00'; // Orange to stand out
                lockBtn.style.padding = '6px 12px';
                lockBtn.style.fontSize = '0.9em';
                lockBtn.addEventListener('click', () => lockSite(site));
                rightContainer.appendChild(lockBtn);
            }

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.className = 'remove-btn';
            removeBtn.addEventListener('click', () => initiateRemoveSite(site));

            rightContainer.appendChild(removeBtn);

            li.appendChild(leftContainer);
            li.appendChild(rightContainer);
            siteListEl.appendChild(li);
        });

        lockAllBtn.style.display = hasUnlockedSites ? 'block' : 'none';

        if (timerInterval) clearInterval(timerInterval);
        if (hasUnlockedSites) {
            timerInterval = setInterval(updateAllTimers, 1000);
        }
    }

    function updateTimerDisplay(element, expiry) {
        const remaining = expiry - Date.now();
        if (remaining <= 0) {
            element.textContent = 'Locked';
            element.style.color = 'var(--text-color)';
            loadSites(); // Reload to remove lock button and update state
        } else {
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            element.textContent = `Unlocked for: ${mins}m ${secs}s`;
        }
    }

    function updateAllTimers() {
        const timerSpans = document.querySelectorAll('.timer-span');
        timerSpans.forEach(span => {
            const expiry = parseInt(span.dataset.expiry, 10);
            updateTimerDisplay(span, expiry);
        });
    }

    function lockSite(siteToLock) {
        chrome.storage.local.get(['unlockedSites'], (result) => {
            const unlockedSites = result.unlockedSites || {};
            delete unlockedSites[siteToLock];
            chrome.storage.local.set({ unlockedSites }, () => {
                loadSites();
            });
        });
    }

    function lockAllSites() {
        chrome.storage.local.set({ unlockedSites: {} }, () => {
            loadSites();
        });
    }

    function addSite() {
        let site = newSiteInput.value.trim().toLowerCase();
        if (!site) return showError("Please enter a site name.");
        site = site.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        chrome.storage.local.get(['blockedSites', 'unlockedSites'], (result) => {
            const sites = result.blockedSites || [];
            if (sites.includes(site)) return showError("Site is already in the list.");
            sites.push(site);
            chrome.storage.local.set({ blockedSites: sites }, () => {
                newSiteInput.value = '';
                errorMsg.textContent = '';
                renderSites(sites, result.unlockedSites || {});
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
        expectedAnswer = Math.floor(Math.random() * 20) - 10;

        let a = Math.floor(Math.random() * 8) + 1;
        if (Math.random() > 0.5) a = -a;
        let d1 = Math.floor(Math.random() * 5) + 2;

        let b = Math.floor(Math.random() * 20) - 10;
        if (b === 0) b = 1;
        let d2 = Math.floor(Math.random() * 5) + 2;

        let num = (a * expectedAnswer * d2) + (b * d1);
        let den = d1 * d2;

        function gcd(x, y) {
            x = Math.abs(x);
            y = Math.abs(y);
            while(y) {
                var t = y;
                y = x % y;
                x = t;
            }
            return x || 1;
        }

        let divisor = gcd(num, den);
        let c = num / divisor;
        let d3 = den / divisor;

        if (d3 < 0) {
            c = -c;
            d3 = -d3;
        }

        let term1 = d1 === 1 ? `${a}x` : `(${a}/${d1})x`;

        let term2 = '';
        if (b > 0) {
            term2 = d2 === 1 ? ` + ${b}` : ` + (${b}/${d2})`;
        } else {
            term2 = d2 === 1 ? ` - ${Math.abs(b)}` : ` - (${Math.abs(b)}/${d2})`;
        }

        let rightSide = d3 === 1 ? `${c}` : `${c}/${d3}`;

        let equationStr = `${term1}${term2} = ${rightSide}`;
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
            chrome.storage.local.get(['blockedSites', 'unlockedSites'], (result) => {
                let sites = result.blockedSites || [];
                sites = sites.filter(site => site !== currentSiteToRemove);

                let unlockedSites = result.unlockedSites || {};
                delete unlockedSites[currentSiteToRemove]; // Also lock it if removing

                chrome.storage.local.set({ blockedSites: sites, unlockedSites: unlockedSites }, () => {
                    renderSites(sites, unlockedSites);
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
    lockAllBtn.addEventListener('click', lockAllSites);

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