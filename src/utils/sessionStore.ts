import fs from 'fs';
import path from 'path';

const SESSION_FILE = path.join(__dirname, '..', '..', 'sessions.json');

interface SessionData {
    [nodeName: string]: string;
}

/**
 * Load saved Lavalink Node session IDs from disk.
 */
export function loadSessions(): SessionData {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            const data = fs.readFileSync(SESSION_FILE, 'utf-8');
            return JSON.parse(data) || {};
        }
    } catch {
        // Ignore read/parse errors
    }
    return {};
}

/**
 * Save Lavalink Node session ID to disk.
 */
export function saveSession(nodeName: string, sessionId: string): void {
    try {
        const sessions = loadSessions();
        sessions[nodeName] = sessionId;
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
    } catch (err) {
        console.warn(`[SessionStore] ⚠️ Failed to save session ID for node ${nodeName}:`, err);
    }
}

/**
 * Get saved session ID for a specific node name.
 */
export function getSession(nodeName: string): string | null {
    const sessions = loadSessions();
    return sessions[nodeName] ?? null;
}
