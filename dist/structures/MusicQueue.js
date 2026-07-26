"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicQueue = void 0;
class MusicQueue {
    tracks = [];
    current = null;
    previous = null;
    history = [];
    loop = 'off';
    volume = 100;
    filter = 'none';
    textChannelId;
    player;
    paused = false;
    lastNowPlayingMessage = null;
    nowPlayingInterval = null;
    leaveTimeout = null;
    constructor(player, textChannelId) {
        this.player = player;
        this.textChannelId = textChannelId;
    }
    /** Stop the 15-minute idle leave timer. */
    stopLeaveTimeout() {
        if (this.leaveTimeout) {
            clearTimeout(this.leaveTimeout);
            this.leaveTimeout = null;
        }
    }
    /** Stop the live progress bar update interval. */
    stopNowPlayingUpdater() {
        if (this.nowPlayingInterval) {
            clearInterval(this.nowPlayingInterval);
            this.nowPlayingInterval = null;
        }
    }
    /** Delete the previous Now Playing message from the channel. */
    async deleteLastNowPlayingMessage() {
        this.stopNowPlayingUpdater();
        if (this.lastNowPlayingMessage) {
            try {
                await this.lastNowPlayingMessage.delete();
            }
            catch {
                // Ignore if already deleted
            }
            this.lastNowPlayingMessage = null;
        }
    }
    /** Add a single track to the end of the queue. */
    addTrack(track) {
        this.tracks.push(track);
    }
    /** Add multiple tracks to the end of the queue. */
    addTracks(tracks) {
        this.tracks.push(...tracks);
    }
    /** Remove a track at the given 0-based index. Returns the removed track or null. */
    removeTrack(index) {
        if (index < 0 || index >= this.tracks.length)
            return null;
        return this.tracks.splice(index, 1)[0];
    }
    /** Fisher-Yates shuffle of the upcoming queue. */
    shuffle() {
        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }
    }
    /** Clear all upcoming tracks. */
    clear() {
        this.tracks = [];
    }
    /** Total duration of current track + all upcoming tracks (ms). */
    get totalDuration() {
        let total = this.current?.info.length ?? 0;
        for (const track of this.tracks) {
            total += track.info.length;
        }
        return total;
    }
    /** Number of upcoming tracks (does not count current). */
    get size() {
        return this.tracks.length;
    }
    /**
     * Advance to the next track respecting loop mode.
     * Returns the new current track or null if queue is exhausted.
     */
    nextTrack() {
        // Push current into history
        if (this.current) {
            this.previous = this.current;
            this.history.push(this.current);
            if (this.history.length > 100)
                this.history.shift();
        }
        // Track loop → replay current
        if (this.loop === 'track' && this.current) {
            return this.current;
        }
        // Queue empty → if queue-loop, recycle history
        if (this.tracks.length === 0) {
            if (this.loop === 'queue' && this.history.length > 0) {
                this.tracks = [...this.history];
                this.history = [];
            }
            else {
                this.current = null;
                return null;
            }
        }
        this.current = this.tracks.shift() ?? null;
        return this.current;
    }
    /**
     * Go back to the previously played track.
     * Returns the restored track or null if no history.
     */
    previousTrack() {
        if (!this.previous)
            return null;
        // Push current back to the front of the queue
        if (this.current) {
            this.tracks.unshift(this.current);
        }
        this.current = this.previous;
        this.previous = this.history.length > 1
            ? this.history[this.history.length - 2]
            : null;
        return this.current;
    }
}
exports.MusicQueue = MusicQueue;
