import { Node } from 'shoukaku';
/**
 * Smart Multi-Platform Audio Resolver
 * Automatically searches YouTube Music, Spotify, YouTube, and SoundCloud,
 * selecting the best result with seamless fallback.
 */
export declare function smartResolve(node: Node, query: string): Promise<import("shoukaku").TrackResult | import("shoukaku").PlaylistResult | import("shoukaku").SearchResult | null>;
