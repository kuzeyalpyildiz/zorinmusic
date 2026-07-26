import dotenv from 'dotenv';
dotenv.config();

// ── Lavalink Node Definition ──
export interface LavalinkNodeConfig {
    name: string;
    host: string;
    port: number;
    password: string;
    secure: boolean;
}

/**
 * Parse LAVALINK_NODES from environment.
 *
 * Format (pipe-separated list, each node is colon-separated):
 *   LAVALINK_NODES=Name:host:port:password:secure|Name2:host2:port2:password2:secure2
 *
 * Example:
 *   LAVALINK_NODES=ZaraNode:zara.hidencloud.com:24654:youshallnotpass:false|BackupNode:lava2.example.com:2333:mypass:false
 *
 * Falls back to the legacy single-node env vars if LAVALINK_NODES is not set.
 */
function parseLavalinkNodes(): LavalinkNodeConfig[] {
    const nodesEnv = process.env.LAVALINK_NODES?.trim();

    if (nodesEnv) {
        const nodes: LavalinkNodeConfig[] = [];

        const entries = nodesEnv.split('|').map(s => s.trim()).filter(Boolean);
        for (const entry of entries) {
            const parts = entry.split(':');
            // Minimum: name:host:port:password  (secure defaults to false)
            if (parts.length < 4) {
                console.warn(`[Config] ⚠️  Skipping malformed Lavalink node entry: "${entry}" — expected name:host:port:password[:secure]`);
                continue;
            }

            nodes.push({
                name: parts[0],
                host: parts[1],
                port: parseInt(parts[2], 10),
                password: parts[3],
                secure: parts[4]?.toLowerCase() === 'true',
            });
        }

        if (nodes.length > 0) {
            console.log(`[Config] ✅ Loaded ${nodes.length} Lavalink node(s) from LAVALINK_NODES.`);
            return nodes;
        }

        console.warn('[Config] ⚠️  LAVALINK_NODES was set but contained no valid entries. Falling back to legacy env vars.');
    }

    // Legacy single-node fallback
    return [{
        name: process.env.LAVALINK_NAME || 'Main',
        host: process.env.LAVALINK_HOST || 'localhost',
        port: parseInt(process.env.LAVALINK_PORT || '2333', 10),
        password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
        secure: process.env.LAVALINK_SECURE === 'true',
    }];
}

export const config = {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',
    prefix: process.env.DEFAULT_PREFIX || '!',
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID || '',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    },
    lavalink: {
        nodes: parseLavalinkNodes(),
    },
};
