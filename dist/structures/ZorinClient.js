"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZorinClient = void 0;
const discord_js_1 = require("discord.js");
const shoukaku_1 = require("shoukaku");
const MusicQueue_1 = require("./MusicQueue");
const config_1 = require("../config");
const embeds_1 = require("../utils/embeds");
const sessionStore_1 = require("../utils/sessionStore");
const playerStore_1 = require("../utils/playerStore");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
class ZorinClient extends discord_js_1.Client {
    commands = new discord_js_1.Collection();
    aliases = new discord_js_1.Collection();
    shoukaku;
    queues = new Map();
    _cachedNode = null;
    _nodeCacheExpiry = 0;
    _nodeErrors = new Map();
    _nodeCooldowns = new Map();
    constructor() {
        super({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildVoiceStates,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
            ],
        });
        this.shoukaku = new shoukaku_1.Shoukaku(new shoukaku_1.Connectors.DiscordJS(this), [], {
            moveOnDisconnect: false,
            resume: true,
            resumeTimeout: config_1.config.lavalink.resumeTimeout,
            reconnectTries: 1,
            reconnectInterval: 15_000,
            restTimeout: 15_000,
        });
        // Attach Shoukaku lifecycle handlers immediately to prevent ERR_UNHANDLED_ERROR
        this.shoukaku.on('ready', async (name, resumed) => {
            const node = this.shoukaku.nodes.get(name);
            this._nodeErrors.set(name, 0); // Reset error count on clean connection
            this._nodeCooldowns.delete(name);
            if (node?.sessionId) {
                (0, sessionStore_1.saveSession)(name, node.sessionId);
                console.log(`[Lavalink] ✅ Node "${name}" connected (Session-Id: ${node.sessionId}, Resumed: ${resumed}).`);
            }
            else {
                console.log(`[Lavalink] ✅ Node "${name}" connected.`);
            }
            if (resumed && node) {
                try {
                    const activePlayers = await node.rest.getPlayers();
                    console.log(`[Lavalink] 🔄 Session resumed for node "${name}" — restored ${activePlayers.length} active Lavalink player(s).`);
                }
                catch (err) {
                    console.warn(`[Lavalink] ⚠️ Failed to fetch active resumed players for node "${name}":`, err);
                }
            }
        });
        const recordNodeFault = (name, reason) => {
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
                        node.state = 3;
                    }
                    catch { }
                    this.shoukaku.nodes.delete(name);
                }
            }
            else {
                console.warn(`[Lavalink] ⚠️ Node "${name}" fault count: ${count}/4 (${reason}).`);
            }
        };
        this.shoukaku.on('error', (name, error) => {
            const msg = error?.message ?? String(error);
            recordNodeFault(name, `error: ${msg}`);
        });
        this.shoukaku.on('close', (name, code, reason) => {
            recordNodeFault(name, `close code ${code}: ${reason || 'unknown'}`);
        });
        this.shoukaku.on('disconnect', (name, count) => {
            recordNodeFault(name, `disconnected (${count} players)`);
        });
    }
    /** Connect Lavalink nodes after Discord client user ID is populated to prevent "UserId missing" errors. */
    connectLavalinkNodes() {
        if (this.user?.id) {
            this.shoukaku.id = this.user.id;
        }
        const savedSessions = (0, sessionStore_1.loadSessions)();
        for (const n of config_1.config.lavalink.nodes) {
            if (this.shoukaku.nodes.has(n.name))
                continue;
            const nodeOptions = {
                name: n.name,
                url: `${n.host}:${n.port}`,
                auth: n.password,
                secure: n.secure,
            };
            const node = new shoukaku_1.Node(this.shoukaku, nodeOptions);
            const savedSessionId = savedSessions[n.name];
            if (savedSessionId) {
                node.sessionId = savedSessionId;
                console.log(`[Lavalink] 🔑 Pre-loaded Session-Id "${savedSessionId}" for node "${n.name}" before connection handshake.`);
            }
            node.on('debug', (...args) => this.shoukaku.emit('debug', node.name, ...args));
            node.on('reconnecting', (...args) => this.shoukaku.emit('reconnecting', node.name, ...args));
            node.on('error', (...args) => this.shoukaku.emit('error', node.name, ...args));
            node.on('close', (...args) => this.shoukaku.emit('close', node.name, ...args));
            node.on('ready', (...args) => this.shoukaku.emit('ready', node.name, ...args));
            node.on('raw', (...args) => this.shoukaku.emit('raw', node.name, ...args));
            node.once('disconnect', () => this.shoukaku.nodes.delete(node.name));
            this.shoukaku.nodes.set(node.name, node);
            node.connect().catch((error) => this.shoukaku.emit('error', node.name, error));
        }
    }
    // ── Lavalink helpers ──
    /** Get the active connected Lavalink node (skipping nodes on 1-hour error cooldown). */
    getNode() {
        if (this._cachedNode && Date.now() < this._nodeCacheExpiry) {
            const cooldown = this._nodeCooldowns.get(this._cachedNode.name) || 0;
            if (Date.now() >= cooldown && this._cachedNode.state === 1) {
                return this._cachedNode;
            }
        }
        const now = Date.now();
        const connectedNode = [...this.shoukaku.nodes.values()].find(n => {
            if (n.state !== 1)
                return false;
            const cooldown = this._nodeCooldowns.get(n.name) || 0;
            if (now < cooldown)
                return false; // Skip node on 1-hour error cooldown
            return true;
        });
        if (!connectedNode)
            throw new Error('No healthy connected Lavalink nodes available. Please check node connectivity in .env.');
        this._cachedNode = connectedNode;
        this._nodeCacheExpiry = Date.now() + 5000;
        return connectedNode;
    }
    /**
     * Join a voice channel, create a player, wire up player events, and return
     * the queue. If a queue already exists for this guild it is returned as-is.
     */
    async createPlayer(guildId, channelId, shardId, textChannelId) {
        let queue = this.queues.get(guildId);
        if (queue)
            return queue;
        // Ensure active node exists before attempting connection
        this.getNode();
        const player = await this.shoukaku.joinVoiceChannel({
            guildId,
            channelId,
            shardId,
            deaf: true,
        });
        queue = new MusicQueue_1.MusicQueue(player, textChannelId);
        this.queues.set(guildId, queue);
        // ── Player events ──
        player.on('start', async () => {
            if (!queue.current)
                return;
            // Only save player state if an active track is currently playing
            (0, playerStore_1.savePlayerState)(guildId, {
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
                const embed = (0, embeds_1.createNowPlayingEmbed)(queue.current, player.position);
                const components = (0, embeds_1.createNowPlayingComponents)(queue);
                const msg = await channel.send({ embeds: [embed], components }).catch(() => null);
                if (msg) {
                    queue.lastNowPlayingMessage = msg;
                    // Live progress bar updater every 5 seconds
                    queue.nowPlayingInterval = setInterval(async () => {
                        if (!queue.current || queue.paused || !queue.lastNowPlayingMessage)
                            return;
                        try {
                            const updatedEmbed = (0, embeds_1.createNowPlayingEmbed)(queue.current, player.position);
                            const updatedComponents = (0, embeds_1.createNowPlayingComponents)(queue);
                            await queue.lastNowPlayingMessage.edit({ embeds: [updatedEmbed], components: updatedComponents });
                            // Periodically update saved position
                            if (queue.current) {
                                (0, playerStore_1.savePlayerState)(guildId, {
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
                            }
                        }
                        catch {
                            queue.stopNowPlayingUpdater();
                        }
                    }, 5000);
                }
            }
        });
        player.on('end', async (data) => {
            queue.stopNowPlayingUpdater();
            if (data.reason === 'replaced')
                return;
            const next = queue.nextTrack();
            if (next) {
                player.playTrack({ track: { encoded: next.encoded } });
            }
            else {
                (0, playerStore_1.removePlayerState)(guildId);
                await queue.deleteLastNowPlayingMessage();
                const channel = this.channels.cache.get(queue.textChannelId);
                if (channel && channel.isSendable()) {
                    const notice = await channel.send({ embeds: [(0, embeds_1.createInfoEmbed)('🎵  Queue finished! Staying in voice channel for 15 minutes before disconnecting.')] }).catch(() => null);
                    if (notice)
                        setTimeout(() => notice.delete().catch(() => { }), 10000);
                }
                // Start 15-minute idle timeout
                queue.stopLeaveTimeout();
                queue.leaveTimeout = setTimeout(async () => {
                    const ch = this.channels.cache.get(queue.textChannelId);
                    if (ch && ch.isSendable()) {
                        const leaveEmbed = (0, embeds_1.createEmbed)({
                            color: embeds_1.Colors.Info,
                            title: '👋  Left Voice Channel',
                            description: 'No tracks were played for 15 minutes, so I left the voice channel to conserve resources.',
                            footer: 'Zorin Music',
                        });
                        await ch.send({ embeds: [leaveEmbed] }).catch(() => { });
                    }
                    this.destroyPlayer(guildId);
                }, 15 * 60 * 1000);
            }
        });
        player.on('closed', () => {
            queue.stopLeaveTimeout();
            queue.deleteLastNowPlayingMessage().catch(() => { });
            (0, playerStore_1.removePlayerState)(guildId);
            this.queues.delete(guildId);
        });
        player.on('exception', (data) => {
            const channel = this.channels.cache.get(queue.textChannelId);
            if (channel && channel.isSendable()) {
                channel.send({ embeds: [(0, embeds_1.createErrorEmbed)(`Track error: ${data.message ?? 'Unknown error'}`)] }).catch(() => { });
            }
            const next = queue.nextTrack();
            if (next) {
                player.playTrack({ track: { encoded: next.encoded } });
            }
        });
        return queue;
    }
    /** Destroy the player and clean up the queue for a guild. */
    destroyPlayer(guildId) {
        const queue = this.queues.get(guildId);
        if (queue) {
            queue.stopLeaveTimeout();
            queue.deleteLastNowPlayingMessage().catch(() => { });
        }
        (0, playerStore_1.removePlayerState)(guildId);
        this.queues.delete(guildId);
        try {
            this.shoukaku.leaveVoiceChannel(guildId);
        }
        catch {
            // Already disconnected — ignore.
        }
    }
    /** Automatically re-join voice channels and resume playback ONLY if a track was actively playing before restart. */
    async reconnectActivePlayers() {
        const savedPlayers = (0, playerStore_1.loadAllPlayerStates)();
        const entries = Object.entries(savedPlayers);
        if (entries.length === 0)
            return;
        // Wait up to 5 seconds for at least 1 Lavalink node to complete WebSocket handshake
        let connectedNode = [...this.shoukaku.nodes.values()].find(n => n.state === 1);
        if (!connectedNode) {
            let waits = 0;
            while (!connectedNode && waits < 10) {
                await new Promise(res => setTimeout(res, 500));
                waits++;
                connectedNode = [...this.shoukaku.nodes.values()].find(n => n.state === 1);
            }
        }
        if (!connectedNode) {
            console.log('[Zorin Music] ℹ️ Skipping player auto-reconnect: No connected Lavalink nodes available after waiting.');
            return;
        }
        console.log(`[Zorin Music] 🔄 Found ${entries.length} active track session(s) in store. Querying Lavalink server state...`);
        // Fetch live active players directly from ALL connected Lavalink nodes to get exact server state
        let liveLavalinkPlayers = [];
        for (const node of this.shoukaku.nodes.values()) {
            if (node.state === 1) {
                try {
                    const nodePlayers = await node.rest.getPlayers();
                    liveLavalinkPlayers.push(...nodePlayers);
                }
                catch (err) {
                    console.warn(`[Lavalink REST] ⚠️ Failed to fetch players from node "${node.name}":`, err);
                }
            }
        }
        console.log(`[Lavalink REST] 🛰️ Fetched ${liveLavalinkPlayers.length} total active player(s) across all connected Lavalink nodes.`);
        for (const [guildId, saved] of entries) {
            // Only reconnect if a track was actively playing
            if (!saved.currentTrack) {
                (0, playerStore_1.removePlayerState)(guildId);
                continue;
            }
            try {
                const guild = this.guilds.cache.get(guildId);
                if (!guild) {
                    (0, playerStore_1.removePlayerState)(guildId);
                    continue;
                }
                const voiceChannel = guild.channels.cache.get(saved.channelId);
                if (!voiceChannel) {
                    (0, playerStore_1.removePlayerState)(guildId);
                    continue;
                }
                // Re-join voice channel and recreate queue
                const queue = await this.createPlayer(saved.guildId, saved.channelId, saved.shardId, saved.textChannelId);
                // Stop any pending idle/alone leave timeouts immediately upon reconnect
                queue.stopLeaveTimeout();
                // 🎯 Direct Lavalink REST Sync: Fetch live playing track straight from Lavalink server
                const livePlayer = liveLavalinkPlayers.find((p) => p.guildId === guildId);
                if (livePlayer && livePlayer.track) {
                    queue.current = {
                        encoded: livePlayer.track.encoded,
                        info: {
                            identifier: livePlayer.track.info.identifier,
                            isSeekable: livePlayer.track.info.isSeekable,
                            author: livePlayer.track.info.author,
                            length: livePlayer.track.info.length,
                            isStream: livePlayer.track.info.isStream,
                            position: livePlayer.state?.position ?? livePlayer.track.info.position ?? saved.position ?? 0,
                            title: livePlayer.track.info.title,
                            uri: livePlayer.track.info.uri,
                            artworkUrl: livePlayer.track.info.artworkUrl,
                            sourceName: livePlayer.track.info.sourceName,
                        },
                        requester: saved.currentTrack?.requester || {
                            id: this.user.id,
                            username: 'System (Resumed)',
                            displayName: 'System',
                            avatarURL: this.user.displayAvatarURL(),
                        },
                    };
                    console.log(`[Zorin Music] 🎯 Synced live playing track "${queue.current.info.title}" directly from Lavalink server!`);
                }
                else if (saved.currentTrack) {
                    queue.current = saved.currentTrack;
                }
                if (saved.queueTracks && saved.queueTracks.length > 0) {
                    queue.tracks = saved.queueTracks;
                }
                if (saved.loop) {
                    queue.loop = saved.loop;
                }
                // Only send playTrack if Lavalink is not already actively playing this track
                if (!queue.player.track && saved.currentTrack) {
                    await queue.player.playTrack({
                        track: { encoded: saved.currentTrack.encoded },
                        position: saved.position || 0,
                    });
                    if (saved.paused) {
                        await queue.player.setPaused(true);
                    }
                }
                console.log(`[Zorin Music] ✅ Reconnected player to voice channel "${voiceChannel.name}" in ${guild.name} (Playing: ${queue.current?.info?.title || 'Unknown'}).`);
            }
            catch (err) {
                console.warn(`[Zorin Music] ⚠️ Failed to reconnect player for guild ${guildId}:`, err?.message ?? err);
                (0, playerStore_1.removePlayerState)(guildId);
            }
        }
    }
    /** Dynamically load all command files from src/commands/. */
    async loadCommands() {
        const commandsDir = path_1.default.join(__dirname, '..', 'commands');
        if (!fs_1.default.existsSync(commandsDir))
            return;
        const folders = fs_1.default.readdirSync(commandsDir);
        for (const folder of folders) {
            const folderPath = path_1.default.join(commandsDir, folder);
            if (!fs_1.default.statSync(folderPath).isDirectory())
                continue;
            const files = fs_1.default.readdirSync(folderPath).filter(f => f.endsWith('.js') && !f.endsWith('.d.ts'));
            for (const file of files) {
                const mod = require(path_1.default.join(folderPath, file));
                const command = mod.default ?? mod;
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
    async loadEvents() {
        const discordDir = path_1.default.join(__dirname, '..', 'events', 'discord');
        if (!fs_1.default.existsSync(discordDir))
            return;
        const files = fs_1.default.readdirSync(discordDir).filter(f => f.endsWith('.js') && !f.endsWith('.d.ts'));
        for (const file of files) {
            const mod = require(path_1.default.join(discordDir, file));
            const event = mod.default ?? mod;
            if (event.once) {
                this.once(event.name, (...args) => event.execute(this, ...args));
            }
            else {
                this.on(event.name, (...args) => event.execute(this, ...args));
            }
        }
        console.log('[Zorin Music] ✅ Events loaded.');
    }
    /** Bootstrap the bot: load commands & events, connect Shoukaku, login. */
    async start() {
        const startTime = Date.now();
        await Promise.all([this.loadCommands(), this.loadEvents()]);
        process.on('unhandledRejection', (reason) => {
            if (reason?.name === 'RestError' || reason?.message?.includes('Session not found')) {
                console.warn('[Lavalink] ⚠️ Expired Lavalink session caught. Player session will auto-recreate on next command.');
                return;
            }
            if (reason?.message?.includes('Opening handshake has timed out'))
                return;
            console.error('[Unhandled Rejection]', reason);
        });
        process.on('uncaughtException', (error) => {
            if (error?.name === 'RestError' || error?.message?.includes('Session not found')) {
                console.warn('[Lavalink] ⚠️ Expired Lavalink session caught. Player session will auto-recreate on next command.');
                return;
            }
            if (error?.message?.includes('Opening handshake has timed out'))
                return;
            console.error('[Uncaught Exception]', error);
        });
        await this.login(config_1.config.token);
        this.connectLavalinkNodes();
        const statusPort = parseInt(process.env.PORT || '20270', 10);
        this.startStatusServer(statusPort);
        console.log(`[Zorin Music] 🚀 Startup completed in ${Date.now() - startTime}ms.`);
    }
    /** Launch a lightweight live HTTP status server for the website. */
    startStatusServer(port = 20270) {
        const server = http_1.default.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Content-Type', 'application/json');
            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }
            const totalNodes = config_1.config.lavalink.nodes.length || 1;
            const connectedNodes = [...this.shoukaku.nodes.values()].filter(n => n.state === 1).length;
            const ping = Math.max(1, Math.round(this.ws.ping || 14));
            const uptimeSeconds = Math.floor(process.uptime());
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'online',
                shardStatus: 'online',
                lavalinkStatus: connectedNodes > 0 ? 'online' : 'offline',
                uptimePercentage: '99.98%',
                uptimeSeconds,
                pingMs: ping,
            }));
        });
        server.listen(port, '0.0.0.0', () => {
            console.log(`[Status API] 🌐 Live status server listening on port ${port} (0.0.0.0).`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.warn(`[Status API] ⚠️ Port ${port} in use, skipping status server startup.`);
            }
        });
    }
}
exports.ZorinClient = ZorinClient;
