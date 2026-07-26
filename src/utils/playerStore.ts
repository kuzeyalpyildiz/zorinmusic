import fs from 'fs';
import path from 'path';
import { QueueTrack, LoopMode } from '../types';

const PLAYERS_FILE = path.join(__dirname, '..', '..', 'players.json');

export interface SavedPlayerState {
    guildId: string;
    channelId: string;
    textChannelId: string;
    shardId: number;
    currentTrack?: QueueTrack;
    queueTracks?: QueueTrack[];
    position?: number;
    loop?: LoopMode;
    paused?: boolean;
}

interface PlayerStoreData {
    [guildId: string]: SavedPlayerState;
}

/**
 * Load all saved player states from disk.
 */
export function loadAllPlayerStates(): PlayerStoreData {
    try {
        if (fs.existsSync(PLAYERS_FILE)) {
            const data = fs.readFileSync(PLAYERS_FILE, 'utf-8');
            return JSON.parse(data) || {};
        }
    } catch {
        // Ignore read/parse errors
    }
    return {};
}

/**
 * Save active player state for a guild to disk.
 */
export function savePlayerState(guildId: string, state: SavedPlayerState): void {
    try {
        const store = loadAllPlayerStates();
        store[guildId] = state;
        fs.writeFileSync(PLAYERS_FILE, JSON.stringify(store, null, 2), 'utf-8');
    } catch (err) {
        console.warn(`[PlayerStore] ⚠️ Failed to save player state for guild ${guildId}:`, err);
    }
}

/**
 * Remove saved player state for a guild from disk.
 */
export function removePlayerState(guildId: string): void {
    try {
        const store = loadAllPlayerStates();
        if (store[guildId]) {
            delete store[guildId];
            fs.writeFileSync(PLAYERS_FILE, JSON.stringify(store, null, 2), 'utf-8');
        }
    } catch (err) {
        console.warn(`[PlayerStore] ⚠️ Failed to remove player state for guild ${guildId}:`, err);
    }
}
