(function () {
    // Configuration
    const scriptTag = document.currentScript;
    const defaultSessionLimit = 15; // Minutes per session

    // --- Parse Parameters ---
    let sessionLimit = defaultSessionLimit;
    let totalLimit = 0; // 0 means no limit

    // 1. From script attribute
    if (scriptTag) {
        const attr = scriptTag.getAttribute('data-limit');
        if (attr) sessionLimit = parseInt(attr, 10);
    }

    // 2. From URL params (overrides attribute)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('timeLimit')) {
        const val = parseInt(urlParams.get('timeLimit'), 10);
        // If 0 is passed, it means no session limit
        if (!isNaN(val)) sessionLimit = val;
    }
    if (urlParams.has('totalLimit')) {
        const val = parseInt(urlParams.get('totalLimit'), 10);
        if (!isNaN(val)) totalLimit = val;
    }

    // Normalize sessionLimit (if 0, set to very high number for logic)
    const effectiveSessionLimit = (sessionLimit <= 0) ? 9999 : sessionLimit;

    console.log(`GameGuard: Session Limit = ${sessionLimit}m, Total Daily Limit = ${totalLimit}m`);

    // --- Usage Tracking (Daily) ---
    const getTodayKey = () => {
        const d = new Date();
        return `nikohiro_game_usage_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    };

    const getDailyUsage = () => {
        const key = getTodayKey();
        const val = localStorage.getItem(key);
        return val ? parseInt(val, 10) : 0;
    };

    const incrementDailyUsage = () => {
        const key = getTodayKey();
        const current = getDailyUsage();
        localStorage.setItem(key, current + 1);
        return current + 1;
    };

    // Check if daily limit already exceeded on start
    if (totalLimit > 0 && getDailyUsage() >= totalLimit) {
        setTimeout(() => createOverlay("きょうの あそべるじかんは シンプル おわりだよ", false, true), 500);
        return;
    }

    // --- Timer Logic ---
    let sessionSecondsLeft = effectiveSessionLimit * 60;

    // UI Helpers
    function createOverlay(message, isWarning = false, isDailyLimit = false) {
        const existing = document.getElementById('game-guard-overlay');
        const existingWarn = document.getElementById('game-guard-warning');

        if (existing && !isWarning) return; // Already blocked
        if (existingWarn && !isWarning) existingWarn.remove(); // Remove warning to show block
        if (existingWarn && isWarning) return; // Don't duplicate warning

        const overlay = document.createElement('div');
        overlay.id = isWarning ? 'game-guard-warning' : 'game-guard-overlay';

        const style = isWarning
            ? 'position: fixed; top: 10px; right: 10px; background: rgba(255, 165, 2, 0.9); color: white; padding: 10px 20px; border-radius: 10px; font-family: sans-serif; font-weight: bold; z-index: 999999; box-shadow: 0 4px 10px rgba(0,0,0,0.2); animation: slideIn 0.5s;'
            : 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.95); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999999; font-family: sans-serif;';

        overlay.style.cssText = style;

        if (isWarning) {
            overlay.innerHTML = `⚠️ ${message}`;
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 500);
            }, 5000);
        } else {
            const title = isDailyLimit ? "きょうは これでおしまい！" : "おわりの じかんだよ";
            const sub = isDailyLimit ? "1日の あそべるじかんに なりました。" : "きょうは たくさん あそんだね。";

            overlay.innerHTML = `
                <div style="font-size: 5rem; margin-bottom: 20px;">⏰</div>
                <h1 style="font-size: 2.5rem; margin: 0 0 20px 0;">${title}</h1>
                <p style="font-size: 1.2rem; color: #ccc; margin-bottom: 40px;">${sub}<br>また あした あそぼう！</p>
                <button id="gg-back-btn" style="background: #e67e22; color: white; border: none; padding: 15px 40px; font-size: 1.5rem; border-radius: 50px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 0 #d35400; transition: transform 0.1s;">
                    もどる
                </button>
            `;
        }

        document.body.appendChild(overlay);

        if (!isWarning) {
            document.getElementById('gg-back-btn').onclick = () => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.close();
                    window.location.href = "about:blank";
                }
            };

            // Block validation
            document.querySelectorAll('audio, video').forEach(el => el.pause());
        }
    }

    // Helper to format remaining time
    const checkLimits = () => {
        const currentDaily = getDailyUsage();

        // 1. Check Daily Limit
        if (totalLimit > 0 && currentDaily >= totalLimit) {
            clearInterval(timer);
            createOverlay("きょうの じかんは おわりだよ", false, true);
            return;
        }

        // 2. Check Session Limit
        if (sessionSecondsLeft <= 0 && effectiveSessionLimit < 9999) {
            clearInterval(timer);
            createOverlay("おわりの じかんだよ");
            return;
        }

        // Warnings
        // Session warning (1 min left)
        if (effectiveSessionLimit < 9999 && sessionSecondsLeft === 60) {
            createOverlay('もうすぐ おわりの じかんだよ！ (あと1分)', true);
        }

        // Daily warning (1 min left) - approximated by checking if currentUsage is 1 min away
        if (totalLimit > 0 && (totalLimit - currentDaily) === 1 && sessionSecondsLeft % 60 === 0) {
            createOverlay('きょうの あそべるじかんは あと1分だよ！', true);
        }
    };

    // Initial message
    const msg = [];
    if (effectiveSessionLimit < 9999) msg.push(`1かい ${effectiveSessionLimit}ふん`);
    if (totalLimit > 0) {
        const left = totalLimit - getDailyUsage();
        msg.push(`きょうは あと ${left}ふん`);
    }

    if (msg.length > 0) {
        setTimeout(() => {
            createOverlay(`あそべるじかん: ${msg.join('、')}`, true);
        }, 1000);
    }

    // Timer Loop (runs every second)
    const timer = setInterval(() => {
        sessionSecondsLeft--;

        // Every 60 seconds, increment daily usage
        if (sessionSecondsLeft % 60 === 0) {
            // Increment only if we are playing valid time (not already blocked)
            // We increment blindly here every minute of lifetime
            incrementDailyUsage();
        }

        checkLimits();
    }, 1000);

    // CSS
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(styleSheet);

})();
