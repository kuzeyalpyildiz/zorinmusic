import { Message } from 'discord.js';
import { Player } from 'shoukaku';
import { QueueTrack, LoopMode, FilterPreset } from '../types';
export declare class MusicQueue {
    tracks: QueueTrack[];
    current: QueueTrack | null;
    previous: QueueTrack | null;
    history: QueueTrack[];
    loop: LoopMode;
    volume: number;
    filter: FilterPreset;
    textChannelId: string;
    player: Player;
    paused: boolean;
    lastNowPlayingMessage: Message | null;
    nowPlayingInterval: NodeJS.Timeout | null;
    leaveTimeout: NodeJS.Timeout | null;
    constructor(player: Player, textChannelId: string);
    /** Stop the 15-minute idle leave timer. */
    stopLeaveTimeout(): void;
    /** Stop the live progress bar update interval. */
    stopNowPlayingUpdater(): void;
    /** Delete the previous Now Playing message from the channel. */
    deleteLastNowPlayingMessage(): Promise<void>;
    /** Add a single track to the end of the queue. */
    addTrack(track: QueueTrack): void;
    /** Add multiple tracks to the end of the queue. */
    addTracks(tracks: QueueTrack[]): void;
    /** Remove a track at the given 0-based index. Returns the removed track or null. */
    removeTrack(index: number): QueueTrack | null;
    /** Fisher-Yates shuffle of the upcoming queue. */
    shuffle(): void;
    /** Clear all upcoming tracks. */
    clear(): void;
    /** Total duration of current track + all upcoming tracks (ms). */
    get totalDuration(): number;
    /** Number of upcoming tracks (does not count current). */
    get size(): number;
    /**
     * Advance to the next track respecting loop mode.
     * Returns the new current track or null if queue is exhausted.
     */
    nextTrack(): QueueTrack | null;
    /**
     * Go back to the previously played track.
     * Returns the restored track or null if no history.
     */
    previousTrack(): QueueTrack | null;
}
