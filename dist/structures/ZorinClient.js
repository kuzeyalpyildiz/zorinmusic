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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ZorinClient extends discord_js_1.Client {
    commands = new discord_js_1.Collection();
    aliases = new discord_js_1.Collection();
    shoukaku;
    queues = new Map();
    _cachedNode = null;
    _nodeCacheExpiry = 0;
    constructor() {
        super({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildVoiceStates,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
            ],
        });
        const nodes = config_1.config.lavalink.nodes.map(n => ({
            name: n.name,
            url: `${n.host}:${n.port}`,
            auth: n.password,
            secure: n.secure,
        }));
        this.shoukaku = new shoukaku_1.Shoukaku(new shoukaku_1.Connectors.DiscordJS(this), nodes, {
            moveOnDisconnect: false,
            resume: true,
            resumeTimeout: config_1.config.lavalink.resumeTimeout,
            reconnectTries: 2,
            reconnectInterval: 10_000,
            restTimeout: 15_000,
        });
        // Pre-populate Lavalink node sessionId from sessionStore disk cache so Shoukaku includes Session-Id header on handshake
        const savedSessions = (0, sessionStore_1.loadSessions)();
        for (const [nodeName, node] of this.shoukaku.nodes.entries()) {
            const savedSessionId = savedSessions[nodeName];
            if (savedSessionId) {
                node.sessionId = savedSessionId;
            }
        }
    }
    // ── Lavalink helpers ──
    /** Get the active connected Lavalink node. */
    getNode() {
        if (this._cachedNode && Date.now() < this._nodeCacheExpiry) {
            return this._cachedNode;
        }
        const connectedNode = [...this.shoukaku.nodes.values()].find(n => n.state === 1);
        if (!connectedNode)
            throw new Error('No connected Lavalink nodes available. Please check node connectivity in .env.');
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
            // Cancel any pending idle leave timer
            queue.stopLeaveTimeout();
            // Delete previous track's Now Playing embed
            await queue.deleteLastNowPlayingMessage();
            const channel = this.channels.cache.get(queue.textChannelId);
            if (channel && channel.isSendable()) {
                const embed = (0, embeds_1.createNowPlayingEmbed)(queue.current, player.position);
                const msg = await channel.send({ embeds: [embed] }).catch(() => null);
                if (msg) {
                    queue.lastNowPlayingMessage = msg;
                    // Live progress bar updater every 5 seconds
                    queue.nowPlayingInterval = setInterval(async () => {
                        if (!queue.current || queue.paused || !queue.lastNowPlayingMessage)
                            return;
                        try {
                            const updatedEmbed = (0, embeds_1.createNowPlayingEmbed)(queue.current, player.position);
                            await queue.lastNowPlayingMessage.edit({ embeds: [updatedEmbed] });
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
        this.queues.delete(guildId);
        try {
            this.shoukaku.leaveVoiceChannel(guildId);
        }
        catch {
            // Already disconnected — ignore.
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
        // Shoukaku lifecycle events
        this.shoukaku.on('ready', async (name, resumed) => {
            const node = this.shoukaku.nodes.get(name);
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
        this.shoukaku.on('error', (name, error) => {
            console.error(`[Lavalink] ❌ Node "${name}" error:`, error?.message ?? error);
        });
        this.shoukaku.on('close', (name, code, reason) => {
            if (code === 4000) {
                console.warn(`[Lavalink] ⚠️ Node "${name}" closed (code 4000: rate limit). Backing off…`);
            }
            else {
                console.warn(`[Lavalink] ⚠️ Node "${name}" closed — code ${code}: ${reason}`);
            }
        });
        this.shoukaku.on('disconnect', (name, count) => {
            console.warn(`[Lavalink] ⚠️ Node "${name}" disconnected (${count} players affected).`);
        });
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
        console.log(`[Zorin Music] 🚀 Startup completed in ${Date.now() - startTime}ms.`);
    }
}
exports.ZorinClient = ZorinClient;
