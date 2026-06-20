document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUrl = urlParams.get('target');
    const domain = urlParams.get('domain');
    if (!targetUrl || !domain) return;
    document.getElementById('site-name').textContent = domain;
    let a = Math.floor(Math.random() * 8) + 2; 
    if (Math.random() > 0.5) a = -a; 
    let x = Math.floor(Math.random() * 20) - 10; 
    let b = Math.floor(Math.random() * 20) - 10; 
    let c = a * x + b;
    let equationStr = `${a}x`;
    if (b > 0) { equationStr += ` + ${b}`; } 
    else if (b < 0) { equationStr += ` - ${Math.abs(b)}`; }
    equationStr += ` = ${c}`;
    document.getElementById('equation').textContent = equationStr;
    const answerInput = document.getElementById('answer');
    const submitBtn = document.getElementById('submit');
    const errorDiv = document.getElementById('error-message');
    function checkAnswer() {
        const userAnswer = parseInt(answerInput.value, 10);
        if (isNaN(userAnswer)) { errorDiv.textContent = 'Please enter a number.'; return; }
        if (userAnswer === x) {
            const UNLOCK_DURATION_MS = 15 * 60 * 1000;
            const expiry = Date.now() + UNLOCK_DURATION_MS;
            chrome.storage.local.get(['unlockedSites'], (result) => {
                const unlockedSites = result.unlockedSites || {};
                unlockedSites[domain] = expiry;
                chrome.storage.local.set({ unlockedSites: unlockedSites }, () => {
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