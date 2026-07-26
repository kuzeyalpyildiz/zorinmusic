"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const resolver_1 = require("../../utils/resolver");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('play')
        .setDescription('Searches and plays a track or playlist across YouTube Music, Spotify, YouTube & SoundCloud')
        .addStringOption(option => option.setName('query')
        .setDescription('The track or playlist to search for (URL or search keywords)')
        .setRequired(true)),
    aliases: ['p'],
    async execute(interaction) {
        await interaction.deferReply();
        const client = interaction.client;
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('You need to be in a voice channel!')] });
            return;
        }
        const query = interaction.options.getString('query', true);
        let node;
        try {
            node = client.getNode();
        }
        catch {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('Lavalink audio server is currently reconnecting or offline. Please try again in a few seconds!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 5000);
            return;
        }
        const result = await (0, resolver_1.smartResolve)(node, query);
        if (!result) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found across platforms.')] });
            return;
        }
        let queue = client.queues.get(interaction.guildId);
        if (!queue) {
            queue = await client.createPlayer(interaction.guildId, voiceChannel.id, interaction.guild.shardId, interaction.channelId);
        }
        const requester = {
            id: interaction.user.id,
            username: interaction.user.username,
            displayName: interaction.user.displayName,
            avatarURL: interaction.user.displayAvatarURL()
        };
        if (result.loadType === 'playlist') {
            const tracks = result.data.tracks.map((t) => ({ ...t, requester }));
            queue.addTracks(tracks);
            const playlistDuration = tracks.reduce((acc, t) => acc + t.info.length, 0);
            await interaction.editReply({ embeds: [(0, embeds_1.createPlaylistAddedEmbed)(result.data.info.name, tracks.length, playlistDuration, requester)] });
        }
        else {
            const trackData = result.loadType === 'search' ? result.data[0] : result.data;
            const track = { ...trackData, requester };
            queue.addTrack(track);
            await interaction.editReply({ embeds: [(0, embeds_1.createTrackAddedEmbed)(track, queue.size)] });
        }
        setTimeout(() => {
            interaction.deleteReply().catch(() => { });
        }, 5000);
        if (!queue.current) {
            const next = queue.nextTrack();
            if (next) {
                try {
                    await queue.player.playTrack({ track: { encoded: next.encoded } });
                }
                catch {
                    client.destroyPlayer(interaction.guildId);
                    const freshQueue = await client.createPlayer(interaction.guildId, voiceChannel.id, interaction.guild.shardId, interaction.channelId);
                    freshQueue.current = next;
                    await freshQueue.player.playTrack({ track: { encoded: next.encoded } }).catch(() => { });
                }
            }
        }
    },
    async executePrefix(message, args) {
        if (!args.length) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Please provide a query!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const client = message.client;
        const member = message.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('You need to be in a voice channel!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const query = args.join(' ');
        let node;
        try {
            node = client.getNode();
        }
        catch {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Lavalink audio server is currently reconnecting or offline. Please try again in a few seconds!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const result = await (0, resolver_1.smartResolve)(node, query);
        if (!result) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found across platforms.')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        let queue = client.queues.get(message.guildId);
        if (!queue) {
            queue = await client.createPlayer(message.guildId, voiceChannel.id, message.guild.shardId, message.channelId);
        }
        const requester = {
            id: message.author.id,
            username: message.author.username,
            displayName: message.author.displayName,
            avatarURL: message.author.displayAvatarURL()
        };
        let responseMessage;
        if (result.loadType === 'playlist') {
            const tracks = result.data.tracks.map((t) => ({ ...t, requester }));
            queue.addTracks(tracks);
            const playlistDuration = tracks.reduce((acc, t) => acc + t.info.length, 0);
            responseMessage = await message.reply({ embeds: [(0, embeds_1.createPlaylistAddedEmbed)(result.data.info.name, tracks.length, playlistDuration, requester)] });
        }
        else {
            const trackData = result.loadType === 'search' ? result.data[0] : result.data;
            const track = { ...trackData, requester };
            queue.addTrack(track);
            responseMessage = await message.reply({ embeds: [(0, embeds_1.createTrackAddedEmbed)(track, queue.size)] });
        }
        setTimeout(() => {
            responseMessage.delete().catch(() => { });
            message.delete().catch(() => { });
        }, 5000);
        if (!queue.current) {
            const next = queue.nextTrack();
            if (next) {
                try {
                    await queue.player.playTrack({ track: { encoded: next.encoded } });
                }
                catch {
                    client.destroyPlayer(message.guildId);
                    const freshQueue = await client.createPlayer(message.guildId, voiceChannel.id, message.guild.shardId, message.channelId);
                    freshQueue.current = next;
                    await freshQueue.player.playTrack({ track: { encoded: next.encoded } }).catch(() => { });
                }
            }
        }
    }
};
exports.default = command;
