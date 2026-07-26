import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { Shoukaku, Connectors, Player, Node } from 'shoukaku';
import { ZorinCommand, QueueTrack } from '../types';
import { MusicQueue } from './MusicQueue';
import { config } from '../config';
import {
    createNowPlayingEmbed,
    createInfoEmbed,
    createErrorEmbed,
    createEmbed,
    Colors,
} from '../utils/embeds';
import { loadSessions, saveSession } from '../utils/sessionStore';
import { loadAllPlayerStates, savePlayerState, removePlayerState } from '../utils/playerStore';
import fs from 'fs';
import path from 'path';

export class ZorinClient extends Client {
    public commands: Collection<string, ZorinCommand> = new Collection();
    public aliases: Collection<string, string> = new Collection();
    public shoukaku: Shoukaku;
    public queues: Map<string, MusicQueue> = new Map();

    private _cachedNode: Node | null = null;
    private _nodeCacheExpiry: number = 0;
    private _nodeErrors: Map<string, number> = new Map();
    private _nodeCooldowns: Map<string, number> = new Map();

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });

        const nodes = config.lavalink.nodes.map(n => ({
            name: n.name,
            url: `${n.host}:${n.port}`,
            auth: n.password,
            secure: n.secure,
        }));

        this.shoukaku = new Shoukaku(
            new Connectors.DiscordJS(this),
            nodes,
            {
                moveOnDisconnect: false,
                resume: true,
                resumeTimeout: config.lavalink.resumeTimeout,
                reconnectTries: 1,
                reconnectInterval: 15_000,
                restTimeout: 15_000,
            },
        );

        // Pre-populate Lavalink node sessionId from sessionStore disk cache so Shoukaku includes Session-Id header on handshake
        const savedSessions = loadSessions();
        for (const [nodeName, node] of this.shoukaku.nodes.entries()) {
            const savedSessionId = savedSessions[nodeName];
            if (savedSessionId) {
                node.sessionId = savedSessionId;
            }
        }
    }

    // ── Lavalink helpers ──

    /** Get the active connected Lavalink node (skipping nodes on 1-hour error cooldown). */
    public getNode() {
        if (this._cachedNode && Date.now() < this._nodeCacheExpiry) {
            const cooldown = this._nodeCooldowns.get(this._cachedNode.name) || 0;
            if (Date.now() >= cooldown && this._cachedNode.state === 1) {
                return this._cachedNode;
            }
        }

        const now = Date.now();
        const connectedNode = [...this.shoukaku.nodes.values()].find(n => {
            if (n.state !== 1) return false;
            const cooldown = this._nodeCooldowns.get(n.name) || 0;
            if (now < cooldown) return false; // Skip node on 1-hour error cooldown
            return true;
        });

        if (!connectedNode) throw new Error('No healthy connected Lavalink nodes available. Please check node connectivity in .env.');
        
        this._cachedNode = connectedNode;
        this._nodeCacheExpiry = Date.now() + 5000;
        
        return connectedNode;
    }

    /**
     * Join a voice channel, create a player, wire up player events, and return
     * the queue. If a queue already exists for this guild it is returned as-is.
     */
    public async createPlayer(
        guildId: string,
        channelId: string,
        shardId: number,
        textChannelId: string,
    ): Promise<MusicQueue> {
        let queue = this.queues.get(guildId);
        if (queue) return queue;

        // Ensure active node exists before attempting connection
        this.getNode();

        const player: Player = await this.shoukaku.joinVoiceChannel({
            guildId,
            channelId,
            shardId,
            deaf: true,
        });

        queue = new MusicQueue(player, textChannelId);
        this.queues.set(guildId, queue);

        // ── Player events ──

        player.on('start', async () => {
            if (!queue.current) return;

            // Save active player state to disk for auto-reconnection on bot restart
            savePlayerState(guildId, {
                guildId,
                channelId,
                textChannelId,
                shardId,
                currentTrack: queue.current,
                queueTracks: queue.tracks,
                position: player.position,
                loop: queue.loop,
                paused: queue.paused,
            });

            // Cancel any pending idle leave timer
            queue.stopLeaveTimeout();

            // Delete previous track's Now Playing embed
            await queue.deleteLastNowPlayingMessage();

            const channel = this.channels.cache.get(queue.textChannelId);
            if (channel && channel.isSendable()) {
                const embed = createNowPlayingEmbed(queue.current, player.position);
                const msg = await channel.send({ embeds: [embed] }).catch(() => null);
                if (msg) {
                    queue.lastNowPlayingMessage = msg;

                    // Live progress bar updater every 5 seconds
                    queue.nowPlayingInterval = setInterval(async () => {
                        if (!queue.current || queue.paused || !queue.lastNowPlayingMessage) return;
                        try {
                            const updatedEmbed = createNowPlayingEmbed(queue.current, player.position);
                            await queue.lastNowPlayingMessage.edit({ embeds: [updatedEmbed] });
                            
                            // Periodically update saved position
                            savePlayerState(guildId, {
                                guildId,
                                channelId,
                                textChannelId,
                                shardId,
                                currentTrack: queue.current,
                                queueTracks: queue.tracks,
                                position: player.position,
                                loop: queue.loop,
                                paused: queue.paused,
                            });
                        } catch {
                            queue.stopNowPlayingUpdater();
                        }
                    }, 5000);
                }
            }
        });

        player.on('end', async (data) => {
            queue.stopNowPlayingUpdater();
            if ((data as any).reason === 'replaced') return;

            const next = queue.nextTrack();
            if (next) {
                player.playTrack({ track: { encoded: next.encoded } });
            } else {
                removePlayerState(guildId);
                await queue.deleteLastNowPlayingMessage();
                const channel = this.channels.cache.get(queue.textChannelId);
                if (channel && channel.isSendable()) {
                    const notice = await channel.send({ embeds: [createInfoEmbed('🎵  Queue finished! Staying in voice channel for 15 minutes before disconnecting.')] }).catch(() => null);
                    if (notice) setTimeout(() => notice.delete().catch(() => {}), 10000);
                }

                // Start 15-minute idle timeout
                queue.stopLeaveTimeout();
                queue.leaveTimeout = setTimeout(async () => {
                    const ch = this.channels.cache.get(queue.textChannelId);
                    if (ch && ch.isSendable()) {
                        const leaveEmbed = createEmbed({
                            color: Colors.Info,
                            title: '👋  Left Voice Channel',
                            description: 'No tracks were played for 15 minutes, so I left the voice channel to conserve resources.',
                            footer: 'Zorin Music',
                        });
                        await ch.send({ embeds: [leaveEmbed] }).catch(() => {});
                    }
                    this.destroyPlayer(guildId);
                }, 15 * 60 * 1000);
            }
        });

        player.on('closed', () => {
            queue.stopLeaveTimeout();
            queue.deleteLastNowPlayingMessage().catch(() => {});
            removePlayerState(guildId);
            this.queues.delete(guildId);
        });

        player.on('exception', (data) => {
            const channel = this.channels.cache.get(queue.textChannelId);
            if (channel && channel.isSendable()) {
                channel.send({ embeds: [createErrorEmbed(`Track error: ${(data as any).message ?? 'Unknown error'}`)] }).catch(() => {});
            }
            const next = queue.nextTrack();
            if (next) {
                player.playTrack({ track: { encoded: next.encoded } });
            }
        });

        return queue;
    }

    /** Destroy the player and clean up the queue for a guild. */
    public destroyPlayer(guildId: string): void {
        const queue = this.queues.get(guildId);
        if (queue) {
            queue.stopLeaveTimeout();
            queue.deleteLastNowPlayingMessage().catch(() => {});
        }
        removePlayerState(guildId);
        this.queues.delete(guildId);
        try {
            this.shoukaku.leaveVoiceChannel(guildId);
        } catch {
            // Already disconnected — ignore.
        }
    }

    /** Automatically re-join voice channels and resume playback after bot process restarts. */
    public async reconnectActivePlayers(): Promise<void> {
        const savedPlayers = loadAllPlayerStates();
        const entries = Object.entries(savedPlayers);
        if (entries.length === 0) return;

        console.log(`[Zorin Music] 🔄 Found ${entries.length} active player session(s) in store. Reconnecting to voice channels...`);

        for (const [guildId, saved] of entries) {
            try {
                const guild = this.guilds.cache.get(guildId);
                if (!guild) {
                    removePlayerState(guildId);
                    continue;
                }

                const voiceChannel = guild.channels.cache.get(saved.channelId);
                if (!voiceChannel) {
                    removePlayerState(guildId);
                    continue;
                }

                // Re-join voice channel and recreate queue
                const queue = await this.createPlayer(
                    saved.guildId,
                    saved.channelId,
                    saved.shardId,
                    saved.textChannelId,
                );

                if (saved.queueTracks && saved.queueTracks.length > 0) {
                    queue.tracks = saved.queueTracks;
                }
                if (saved.loop) {
                    queue.loop = saved.loop;
                }

                // Check if Lavalink is already playing this session or if we need to resume track
                if (saved.currentTrack && !queue.player.track) {
                    queue.current = saved.currentTrack;
                    await queue.player.playTrack({
                        track: { encoded: saved.currentTrack.encoded },
                        position: saved.position || 0,
                    });
                    if (saved.paused) {
                        await queue.player.setPaused(true);
                    }
                }

                console.log(`[Zorin Music] ✅ Reconnected player to voice channel "${voiceChannel.name}" in ${guild.name}.`);
            } catch (err: any) {
                console.warn(`[Zorin Music] ⚠️ Failed to reconnect player for guild ${guildId}:`, err?.message ?? err);
                removePlayerState(guildId);
            }
        }
    }

    /** Dynamically load all command files from src/commands/. */
    public async loadCommands(): Promise<void> {
        const commandsDir = path.join(__dirname, '..', 'commands');
        if (!fs.existsSync(commandsDir)) return;

        const folders = fs.readdirSync(commandsDir);
        for (const folder of folders) {
            const folderPath = path.join(commandsDir, folder);
            if (!fs.statSync(folderPath).isDirectory()) continue;

            const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js') && !f.endsWith('.d.ts'));
            for (const file of files) {
                const mod = require(path.join(folderPath, file));
                const command: ZorinCommand = mod.default ?? mod;
                this.commands.set(command.data.name, command);

                if (command.aliases) {
                    for (const alias of command.aliases) {
                        this.aliases.set(alias, command.data.name);
                    }
                }
            }
        }

        console.log(`[Zorin Music] ✅ Loaded ${this.commands.size} commands.`);
    }

    /** Load all event files from src/events/discord/. */
    public async loadEvents(): Promise<void> {
        const discordDir = path.join(__dirname, '..', 'events', 'discord');
        if (!fs.existsSync(discordDir)) return;

        const files = fs.readdirSync(discordDir).filter(f => f.endsWith('.js') && !f.endsWith('.d.ts'));
        for (const file of files) {
            const mod = require(path.join(discordDir, file));
            const event = mod.default ?? mod;

            if (event.once) {
                this.once(event.name, (...args: unknown[]) => event.execute(this, ...args));
            } else {
                this.on(event.name, (...args: unknown[]) => event.execute(this, ...args));
            }
        }

        console.log('[Zorin Music] ✅ Events loaded.');
    }

    /** Bootstrap the bot: load commands & events, connect Shoukaku, login. */
    public async start(): Promise<void> {
        const startTime = Date.now();
        await Promise.all([this.loadCommands(), this.loadEvents()]);

        // Shoukaku lifecycle events
        this.shoukaku.on('ready', async (name, resumed) => {
            const node = this.shoukaku.nodes.get(name);
            this._nodeErrors.set(name, 0); // Reset error count on successful connection
            this._nodeCooldowns.delete(name);

            if (node?.sessionId) {
                saveSession(name, node.sessionId);
                console.log(`[Lavalink] ✅ Node "${name}" connected (Session-Id: ${node.sessionId}, Resumed: ${resumed}).`);
            } else {
                console.log(`[Lavalink] ✅ Node "${name}" connected.`);
            }

            if (resumed && node) {
                try {
                    const activePlayers = await node.rest.getPlayers();
                    console.log(`[Lavalink] 🔄 Session resumed for node "${name}" — restored ${activePlayers.length} active Lavalink player(s).`);
                } catch (err) {
                    console.warn(`[Lavalink] ⚠️ Failed to fetch active resumed players for node "${name}":`, err);
                }
            }
        });

        const recordNodeFault = (name: string, reason: string) => {
            const count = (this._nodeErrors.get(name) || 0) + 1;
            this._nodeErrors.set(name, count);

            if (count >= 4) {
                const cooldownUntil = Date.now() + 60 * 60 * 1000;
                this._nodeCooldowns.set(name, cooldownUntil);
                const untilStr = new Date(cooldownUntil).toLocaleTimeString();
                console.warn(`[Lavalink] 🛑 Node "${name}" reached ${count} fault events (${reason}). Placed on 1-hour cooldown until ${untilStr}. Terminating node socket completely!`);
                
                // HARD KILL SWITCH: Strip listeners, terminate WebSocket, and purge node from Shoukaku
                const node = this.shoukaku.nodes.get(name);
                if (node) {
                    try {
                        node.removeAllListeners();
                        if (node.ws) {
                            node.ws.removeAllListeners();
                            node.ws.terminate();
                        }
                        (node as any).state = 3;
                    } catch {}
                    this.shoukaku.nodes.delete(name);
                }
            } else {
                console.warn(`[Lavalink] ⚠️ Node "${name}" fault count: ${count}/4 (${reason}).`);
            }
        };

        this.shoukaku.on('error', (name, error) => {
            const msg = (error as any)?.message ?? String(error);
            recordNodeFault(name, `error: ${msg}`);
        });

        this.shoukaku.on('close', (name, code, reason) => {
            recordNodeFault(name, `close code ${code}: ${reason || 'unknown'}`);
        });

        this.shoukaku.on('disconnect', (name, count) => {
            recordNodeFault(name, `disconnected (${count} players)`);
        });

        process.on('unhandledRejection', (reason: any) => {
            if (reason?.name === 'RestError' || reason?.message?.includes('Session not found')) {
                console.warn('[Lavalink] ⚠️ Expired Lavalink session caught. Player session will auto-recreate on next command.');
                return;
            }
            if (reason?.message?.includes('Opening handshake has timed out')) return;
            console.error('[Unhandled Rejection]', reason);
        });

        process.on('uncaughtException', (error: any) => {
            if (error?.name === 'RestError' || error?.message?.includes('Session not found')) {
                console.warn('[Lavalink] ⚠️ Expired Lavalink session caught. Player session will auto-recreate on next command.');
                return;
            }
            if (error?.message?.includes('Opening handshake has timed out')) return;
            console.error('[Uncaught Exception]', error);
        });

        await this.login(config.token);
        console.log(`[Zorin Music] 🚀 Startup completed in ${Date.now() - startTime}ms.`);
    }
}
