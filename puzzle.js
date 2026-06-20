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

        // Base ranges increase with difficulty
        const maxDenominator = 5 + difficulty * 2;
        const xRange = 10 + (difficulty * 3);
        const constantRange = 10 + (difficulty * 5);

        // Generate the solution (x)
        x = Math.floor(Math.random() * xRange) - Math.floor(xRange / 2);

        // Generate equation components
        // Equation form: (a/d1)x + (b/d2) = (c/d3)
        // We will compute c and d3 based on a, d1, b, d2, and x to ensure a solvable equation.

        let a = Math.floor(Math.random() * 8) + 1;
        if (Math.random() > 0.5) a = -a;
        let d1 = Math.floor(Math.random() * maxDenominator) + 2;

        let b = Math.floor(Math.random() * constantRange) - Math.floor(constantRange / 2);
        if (b === 0) b = 1; // avoid 0
        let d2 = Math.floor(Math.random() * maxDenominator) + 2;

        // Calculate the exact right side
        // c / d3 = (a * x * d2 + b * d1) / (d1 * d2)
        let num = (a * x * d2) + (b * d1);
        let den = d1 * d2;

        // Simplify the fraction for the right side
        function gcd(x, y) {
            x = Math.abs(x);
            y = Math.abs(y);
            while(y) {
                var t = y;
                y = x % y;
                x = t;
            }
            return x;
        }

        let divisor = gcd(num, den);
        let c = num / divisor;
        let d3 = den / divisor;

        // Ensure denominator is positive
        if (d3 < 0) {
            c = -c;
            d3 = -d3;
        }

        // Format the equation string
        let term1 = d1 === 1 ? `${a}x` : `(${a}/${d1})x`;

        let term2 = '';
        if (b > 0) {
            term2 = d2 === 1 ? ` + ${b}` : ` + (${b}/${d2})`;
        } else {
            term2 = d2 === 1 ? ` - ${Math.abs(b)}` : ` - (${Math.abs(b)}/${d2})`;
        }

        let rightSide = d3 === 1 ? `${c}` : `${c}/${d3}`;

        let equationStr = `${term1}${term2} = ${rightSide}`;

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