"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoUpdater = void 0;
const child_process_1 = require("child_process");
class AutoUpdater {
    client;
    checkInterval = null;
    updatePending = false;
    constructor(client) {
        this.client = client;
    }
    /** Start periodic check for GitHub updates (default: every 5 minutes). */
    startPolling(intervalMs = 5 * 60 * 1000) {
        console.log('[Auto-Updater] 🔄 GitHub auto-update service initialized.');
        // Initial check 30 seconds after startup
        setTimeout(() => this.check(), 30_000);
        this.checkInterval = setInterval(() => this.check(), intervalMs);
    }
    /** Stop update polling. */
    stopPolling() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    /** Check if any guild is currently playing audio. */
    isBotIdle() {
        if (this.client.queues.size === 0)
            return true;
        for (const queue of this.client.queues.values()) {
            if (queue.current)
                return false;
        }
        return true;
    }
    /** Check GitHub for new commits/releases. */
    async check() {
        try {
            // Fetch latest commits from remote git repository
            (0, child_process_1.execSync)('git fetch origin', { stdio: 'ignore' });
            const localHead = (0, child_process_1.execSync)('git rev-parse HEAD').toString().trim();
            const remoteHead = (0, child_process_1.execSync)('git rev-parse origin/main').toString().trim();
            if (localHead !== remoteHead) {
                console.log('[Auto-Updater] 🚀 New GitHub release/update detected!');
                if (this.isBotIdle()) {
                    await this.applyUpdate();
                }
                else {
                    if (!this.updatePending) {
                        this.updatePending = true;
                        console.log('[Auto-Updater] ⏳ Music is currently playing. Update queued — will apply automatically as soon as all queues are idle.');
                    }
                }
            }
        }
        catch (err) {
            // Git remote not configured or no git repo present — ignore quietly
        }
    }
    /** Called whenever a queue finishes playing to check if a pending update is waiting. */
    async onQueueFinished() {
        if (this.updatePending && this.isBotIdle()) {
            console.log('[Auto-Updater] 🎵 All queues are now idle! Applying pending GitHub update…');
            await this.applyUpdate();
        }
    }
    /** Pull update, re-build TypeScript, and restart process cleanly. */
    async applyUpdate() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📦  Auto-Updater  •  Applying GitHub Update …');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            console.log('[Auto-Updater] ⬇️ Pulling latest changes from GitHub…');
            (0, child_process_1.execSync)('git pull origin main', { stdio: 'inherit' });
            console.log('[Auto-Updater] 🛠️ Rebuilding TypeScript project…');
            (0, child_process_1.execSync)('npm run build', { stdio: 'inherit' });
            console.log('[Auto-Updater] ✅ Update complete! Restarting process…');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            // Exit with code 0 — supervisor (Pterodactyl / index.js / PM2) will re-boot updated code
            process.exit(0);
        }
        catch (err) {
            console.error('[Auto-Updater] ❌ Update failed:', err.message);
            this.updatePending = false;
        }
    }
}
exports.AutoUpdater = AutoUpdater;
//# sourceMappingURL=AutoUpdater.js.map