import { EmbedBuilder } from 'discord.js';
import { QueueTrack } from '../types';
import { MusicQueue } from '../structures/MusicQueue';
export declare const Colors: {
    readonly Primary: 8141549;
    readonly Success: 1096065;
    readonly Error: 15680580;
    readonly Warning: 16096779;
    readonly Music: 15485081;
    readonly Info: 3900150;
    readonly Queue: 9133302;
};
export declare function formatDuration(ms: number): string;
export declare function renderProgressBar(current: number, total: number, size?: number): string;
export declare function createEmbed(options: {
    color?: number;
    title?: string;
    description?: string;
    thumbnail?: string | null;
    footer?: string;
    fields?: {
        name: string;
        value: string;
        inline?: boolean;
    }[];
    author?: {
        name: string;
        iconURL?: string;
        url?: string;
    };
}): EmbedBuilder;
export declare function createSuccessEmbed(description: string): EmbedBuilder;
export declare function createErrorEmbed(description: string): EmbedBuilder;
export declare function createWarningEmbed(description: string): EmbedBuilder;
export declare function createInfoEmbed(description: string): EmbedBuilder;
export declare function createNowPlayingEmbed(track: QueueTrack, position?: number): EmbedBuilder;
export declare function createTrackAddedEmbed(track: QueueTrack, queuePosition: number): EmbedBuilder;
export declare function createPlaylistAddedEmbed(name: string, trackCount: number, totalDuration: number, requester: QueueTrack['requester']): EmbedBuilder;
export declare function createQueueEmbed(queue: MusicQueue, page?: number): EmbedBuilder;
