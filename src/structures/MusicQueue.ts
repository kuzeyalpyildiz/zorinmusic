import { Message } from 'discord.js';
import { Player } from 'shoukaku';
import { QueueTrack, LoopMode, FilterPreset } from '../types';

export class MusicQueue {
    public tracks: QueueTrack[] = [];
    public current: QueueTrack | null = null;
    public previous: QueueTrack | null = null;
    public history: QueueTrack[] = [];
    public loop: LoopMode = 'off';
    public volume: number = 100;
    public filter: FilterPreset = 'none';
    public textChannelId: string;
    public player: Player;
    public paused: boolean = false;
    public lastNowPlayingMessage: Message | null = null;
    public nowPlayingInterval: NodeJS.Timeout | null = null;
    public leaveTimeout: NodeJS.Timeout | null = null;

    constructor(player: Player, textChannelId: string) {
        this.player = player;
        this.textChannelId = textChannelId;
    }

    /** Stop the 15-minute idle leave timer. */
    public stopLeaveTimeout(): void {
        if (this.leaveTimeout) {
            clearTimeout(this.leaveTimeout);
            this.leaveTimeout = null;
        }
    }

    /** Stop the live progress bar update interval. */
    public stopNowPlayingUpdater(): void {
        if (this.nowPlayingInterval) {
            clearInterval(this.nowPlayingInterval);
            this.nowPlayingInterval = null;
        }
    }

    /** Delete the previous Now Playing message from the channel. */
    public async deleteLastNowPlayingMessage(): Promise<void> {
        this.stopNowPlayingUpdater();
        if (this.lastNowPlayingMessage) {
            try {
                await this.lastNowPlayingMessage.delete();
            } catch {
                // Ignore if already deleted
            }
            this.lastNowPlayingMessage = null;
        }
    }

    /** Add a single track to the end of the queue. */
    public addTrack(track: QueueTrack): void {
        this.tracks.push(track);
    }

    /** Add multiple tracks to the end of the queue. */
    public addTracks(tracks: QueueTrack[]): void {
        this.tracks.push(...tracks);
    }

    /** Remove a track at the given 0-based index. Returns the removed track or null. */
    public removeTrack(index: number): QueueTrack | null {
        if (index < 0 || index >= this.tracks.length) return null;
        return this.tracks.splice(index, 1)[0];
    }

    /** Fisher-Yates shuffle of the upcoming queue. */
    public shuffle(): void {
        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }
    }

    /** Clear all upcoming tracks. */
    public clear(): void {
        this.tracks = [];
    }

    /** Total duration of current track + all upcoming tracks (ms). */
    public get totalDuration(): number {
        let total = this.current?.info.length ?? 0;
        for (const track of this.tracks) {
            total += track.info.length;
        }
        return total;
    }

    /** Number of upcoming tracks (does not count current). */
    public get size(): number {
        return this.tracks.length;
    }

    /**
     * Advance to the next track respecting loop mode.
     * Returns the new current track or null if queue is exhausted.
     */
    public nextTrack(): QueueTrack | null {
        // Push current into history
        if (this.current) {
            this.previous = this.current;
            this.history.push(this.current);
            if (this.history.length > 100) this.history.shift();
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
            } else {
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
    public previousTrack(): QueueTrack | null {
        if (!this.previous) return null;

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
