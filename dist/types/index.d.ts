import { ChatInputCommandInteraction, Message } from 'discord.js';
export type LoopMode = 'off' | 'track' | 'queue';
export type FilterPreset = 'none' | 'bassboost' | 'nightcore' | '8d' | 'vaporwave' | 'tremolo' | 'karaoke' | 'pop' | 'soft';
export interface QueueTrack {
    encoded: string;
    info: {
        identifier: string;
        isSeekable: boolean;
        author: string;
        length: number;
        isStream: boolean;
        position: number;
        title: string;
        uri: string | null;
        artworkUrl: string | null;
        sourceName: string;
    };
    requester: {
        id: string;
        username: string;
        displayName: string;
        avatarURL: string | null;
    };
}
export interface ZorinCommand {
    data: {
        name: string;
        toJSON(): unknown;
    };
    aliases?: string[];
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    executePrefix?: (message: Message, args: string[]) => Promise<void>;
}
