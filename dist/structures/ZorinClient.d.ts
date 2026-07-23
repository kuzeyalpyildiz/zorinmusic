import { Client, Collection } from 'discord.js';
import { Shoukaku } from 'shoukaku';
import { ZorinCommand } from '../types';
import { MusicQueue } from './MusicQueue';
export declare class ZorinClient extends Client {
    commands: Collection<string, ZorinCommand>;
    aliases: Collection<string, string>;
    shoukaku: Shoukaku;
    queues: Map<string, MusicQueue>;
    constructor();
    /** Get the first active connected Lavalink node. */
    getNode(): import("shoukaku").Node;
    /**
     * Join a voice channel, create a player, wire up player events, and return
     * the queue. If a queue already exists for this guild it is returned as-is.
     */
    createPlayer(guildId: string, channelId: string, shardId: number, textChannelId: string): Promise<MusicQueue>;
    /** Destroy the player and clean up the queue for a guild. */
    destroyPlayer(guildId: string): void;
    /** Recursively load all command files from src/commands/. */
    loadCommands(): Promise<void>;
    /** Load all event files from src/events/discord/. */
    loadEvents(): Promise<void>;
    /** Bootstrap the bot: load commands & events, connect Shoukaku, login. */
    start(): Promise<void>;
}
