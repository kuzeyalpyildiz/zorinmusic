"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSessions = loadSessions;
exports.saveSession = saveSession;
exports.getSession = getSession;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const SESSION_FILE = path_1.default.join(__dirname, '..', '..', 'sessions.json');
/**
 * Load saved Lavalink Node session IDs from disk.
 */
function loadSessions() {
    try {
        if (fs_1.default.existsSync(SESSION_FILE)) {
            const data = fs_1.default.readFileSync(SESSION_FILE, 'utf-8');
            return JSON.parse(data) || {};
        }
    }
    catch {
        // Ignore read/parse errors
    }
    return {};
}
/**
 * Save Lavalink Node session ID to disk.
 */
function saveSession(nodeName, sessionId) {
    try {
        const sessions = loadSessions();
        sessions[nodeName] = sessionId;
        fs_1.default.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
    }
    catch (err) {
        console.warn(`[SessionStore] ⚠️ Failed to save session ID for node ${nodeName}:`, err);
    }
}
/**
 * Get saved session ID for a specific node name.
 */
function getSession(nodeName) {
    const sessions = loadSessions();
    return sessions[nodeName] ?? null;
}
