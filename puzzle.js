document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUrl = urlParams.get('target');
    const domain = urlParams.get('domain');
    if (!targetUrl || !domain) return;
    document.getElementById('site-name').textContent = domain;

    let x = 0; // expected answer
    let difficulty = 1;

    chrome.storage.local.get(['siteDifficulty'], (result) => {
        const diffMap = result.siteDifficulty || {};
        difficulty = diffMap[domain] || 1;

        // Base range increases with difficulty
        const multiplierRange = 8 + (difficulty * 2);
        const xRange = 20 + (difficulty * 5);
        const constantRange = 20 + (difficulty * 10);

        let a = Math.floor(Math.random() * multiplierRange) + 2;
        if (Math.random() > 0.5) a = -a;
        x = Math.floor(Math.random() * xRange) - Math.floor(xRange / 2);
        let b = Math.floor(Math.random() * constantRange) - Math.floor(constantRange / 2);
        let c = a * x + b;

        let equationStr = `${a}x`;
        if (b > 0) { equationStr += ` + ${b}`; }
        else if (b < 0) { equationStr += ` - ${Math.abs(b)}`; }
        equationStr += ` = ${c}`;

        document.getElementById('equation').textContent = equationStr;
    });

    const answerInput = document.getElementById('answer');
    const submitBtn = document.getElementById('submit');
    const errorDiv = document.getElementById('error-message');

    function checkAnswer() {
        const userAnswer = parseInt(answerInput.value, 10);
        if (isNaN(userAnswer)) { errorDiv.textContent = 'Please enter a number.'; return; }
        if (userAnswer === x) {
            const UNLOCK_DURATION_MS = 15 * 60 * 1000;
            const expiry = Date.now() + UNLOCK_DURATION_MS;
            chrome.storage.local.get(['unlockedSites', 'siteDifficulty'], (result) => {
                const unlockedSites = result.unlockedSites || {};
                unlockedSites[domain] = expiry;

                const siteDifficulty = result.siteDifficulty || {};
                siteDifficulty[domain] = (siteDifficulty[domain] || 1) + 1;

                chrome.storage.local.set({ unlockedSites, siteDifficulty }, () => {
                    window.location.href = targetUrl;
                });
            });
        } else {
            errorDiv.textContent = 'Incorrect. Try again!';
            answerInput.value = '';
            answerInput.focus();
        }
    }
    submitBtn.addEventListener('click', checkAnswer);
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });
});