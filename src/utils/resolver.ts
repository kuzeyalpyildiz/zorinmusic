import { Node } from 'shoukaku';

export const PLATFORM_LABELS: Record<string, string> = {
    'ytmsearch:': '🎵 YouTube Music',
    'spsearch:': '🟢 Spotify',
    'ytsearch:': '🎥 YouTube',
    'scsearch:': '☁️ SoundCloud',
    'dzsearch:': '💿 Deezer',
    'amsearch:': '🍎 Apple Music'
};

const SEARCH_PREFIXES = [
    'ytmsearch:',
    'spsearch:',
    'ytsearch:',
    'scsearch:',
    'dzsearch:',
    'amsearch:'
];

const SEARCH_TIMEOUT_MS = 3500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Timeout'));
        }, ms);
        promise.then(value => {
            clearTimeout(timer);
            resolve(value);
        }).catch(err => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

/**
 * Searches all platforms in parallel with a per-provider timeout.
 * Returns a map of prefix to resolution result.
 */
export async function searchAllPlatforms(node: Node, query: string) {
    const promises = SEARCH_PREFIXES.map(async (prefix) => {
        try {
            const res = await withTimeout(node.rest.resolve(`${prefix}${query}`), SEARCH_TIMEOUT_MS);
            return { prefix, res };
        } catch (e) {
            return { prefix, res: null };
        }
    });

    const results = await Promise.allSettled(promises);
    const validResults: Record<string, any> = {};

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.res) {
            const res = result.value.res;
            if ((res.loadType === 'search' || res.loadType === 'track') && res.data) {
                const data = res.data as any;
                if (Array.isArray(data)) {
                    if (data.length > 0) validResults[result.value.prefix] = res;
                } else if (data) {
                    validResults[result.value.prefix] = res;
                }
            }
        }
    }

    return validResults;
}

/**
 * Smart Multi-Platform Audio Resolver
 * Automatically searches YouTube Music, Spotify, YouTube, SoundCloud, Deezer, and Apple Music
 * selecting the best result with seamless fallback.
 */
export async function smartResolve(node: Node, query: string) {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');

    if (isUrl) {
        // Detect platform from URL domain
        let platform = 'unknown';
        if (query.includes('spotify.com')) platform = 'spotify';
        else if (query.includes('soundcloud.com')) platform = 'soundcloud';
        else if (query.includes('music.youtube.com')) platform = 'youtube-music';
        else if (query.includes('youtube.com') || query.includes('youtu.be')) platform = 'youtube';
        else if (query.includes('deezer.com')) platform = 'deezer';
        else if (query.includes('music.apple.com')) platform = 'apple-music';

        // Direct URL resolve (handles both known and unknown platforms)
        const res = await node.rest.resolve(query).catch(() => null);
        if (res && res.loadType !== 'empty' && res.loadType !== 'error') {
            return res;
        }
        return null;
    }

    // Parallel-first search for text queries
    const allResults = await searchAllPlatforms(node, query);

    // Multi-platform priority search order
    for (const prefix of SEARCH_PREFIXES) {
        if (allResults[prefix]) {
            return allResults[prefix];
        }
    }

    return null;
}
