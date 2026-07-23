"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartResolve = smartResolve;
/**
 * Smart Multi-Platform Audio Resolver
 * Automatically searches YouTube Music, Spotify, YouTube, and SoundCloud,
 * selecting the best result with seamless fallback.
 */
async function smartResolve(node, query) {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    if (isUrl) {
        // Direct URL (Spotify, YouTube, SoundCloud, Apple Music, etc.)
        const res = await node.rest.resolve(query).catch(() => null);
        if (res && res.loadType !== 'empty' && res.loadType !== 'error') {
            return res;
        }
        return null;
    }
    // Multi-platform priority search order for plain text queries:
    // 1. YouTube Music (ytmsearch:) — Best audio quality
    // 2. Spotify (spsearch:) — Preferred metadata
    // 3. YouTube (ytsearch:) — Broadest availability
    // 4. SoundCloud (scsearch:) — Underground / alternative tracks
    const prefixes = ['ytmsearch:', 'spsearch:', 'ytsearch:', 'scsearch:'];
    for (const prefix of prefixes) {
        try {
            const res = await node.rest.resolve(`${prefix}${query}`).catch(() => null);
            if (res && (res.loadType === 'search' || res.loadType === 'track') && res.data) {
                const data = res.data;
                if (Array.isArray(data) && data.length > 0) {
                    return res;
                }
            }
        }
        catch {
            // Try next provider
        }
    }
    return null;
}
//# sourceMappingURL=resolver.js.map