import { ZorinClient } from '../structures/ZorinClient';
export declare class AutoUpdater {
    private client;
    private checkInterval;
    private updatePending;
    constructor(client: ZorinClient);
    /** Start periodic check for GitHub updates (default: every 5 minutes). */
    startPolling(intervalMs?: number): void;
    /** Stop update polling. */
    stopPolling(): void;
    /** Check if any guild is currently playing audio. */
    isBotIdle(): boolean;
    /** Check GitHub for new commits/releases. */
    check(): Promise<void>;
    /** Called whenever a queue finishes playing to check if a pending update is waiting. */
    onQueueFinished(): Promise<void>;
    /** Pull update, re-build TypeScript, and restart process cleanly. */
    applyUpdate(): Promise<void>;
}
