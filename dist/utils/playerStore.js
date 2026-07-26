"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAllPlayerStates = loadAllPlayerStates;
exports.savePlayerState = savePlayerState;
exports.removePlayerState = removePlayerState;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PLAYERS_FILE = path_1.default.join(__dirname, '..', '..', 'players.json');
/**
 * Load all saved player states from disk.
 */
function loadAllPlayerStates() {
    try {
        if (fs_1.default.existsSync(PLAYERS_FILE)) {
            const data = fs_1.default.readFileSync(PLAYERS_FILE, 'utf-8');
            return JSON.parse(data) || {};
        }
    }
    catch {
        // Ignore read/parse errors
    }
    return {};
}
/**
 * Save active player state for a guild to disk.
 */
function savePlayerState(guildId, state) {
    try {
        const store = loadAllPlayerStates();
        store[guildId] = state;
        fs_1.default.writeFileSync(PLAYERS_FILE, JSON.stringify(store, null, 2), 'utf-8');
    }
    catch (err) {
        console.warn(`[PlayerStore] ⚠️ Failed to save player state for guild ${guildId}:`, err);
    }
}
/**
 * Remove saved player state for a guild from disk.
 */
function removePlayerState(guildId) {
    try {
        const store = loadAllPlayerStates();
        if (store[guildId]) {
            delete store[guildId];
            fs_1.default.writeFileSync(PLAYERS_FILE, JSON.stringify(store, null, 2), 'utf-8');
        }
    }
    catch (err) {
        console.warn(`[PlayerStore] ⚠️ Failed to remove player state for guild ${guildId}:`, err);
    }
}
