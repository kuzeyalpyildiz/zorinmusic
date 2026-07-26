"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const resolver_1 = require("../../utils/resolver");
const SOURCE_PREFIX_MAP = {
    ytm: 'ytmsearch',
    ytmsearch: 'ytmsearch',
    youtubemusic: 'ytmsearch',
    sp: 'spsearch',
    spsearch: 'spsearch',
    spotify: 'spsearch',
    yt: 'ytsearch',
    ytsearch: 'ytsearch',
    youtube: 'ytsearch',
    sc: 'scsearch',
    scsearch: 'scsearch',
    soundcloud: 'scsearch',
    dz: 'dzsearch',
    dzsearch: 'dzsearch',
    deezer: 'dzsearch',
    am: 'amsearch',
    amsearch: 'amsearch',
    applemusic: 'amsearch',
};
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for a track across platforms and select from top 5 results')
        .addStringOption(option => option.setName('query')
        .setDescription('The track to search for')
        .setRequired(true))
        .addStringOption(option => option.setName('source')
        .setDescription('Optional audio platform source to search from')
        .setRequired(false)
        .addChoices({ name: '🎵 YouTube Music', value: 'ytmsearch' }, { name: '💚 Spotify', value: 'spsearch' }, { name: '▶️ YouTube', value: 'ytsearch' }, { name: '🟠 SoundCloud', value: 'scsearch' }, { name: '📦 Deezer', value: 'dzsearch' }, { name: '🍎 Apple Music', value: 'amsearch' })),
    aliases: ['sr'],
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
        const source = interaction.options.getString('source');
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
        let result;
        let tracks = [];
        let searchSource = 'Auto Multi-Platform';
        if (source) {
            // Direct explicit source search
            result = await node.rest.resolve(`${source}:${query}`).catch(() => null);
            searchSource = resolver_1.PLATFORM_LABELS[`${source}:`] ?? source.replace('search', '');
            if (!result || !result.data) {
                await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found for your search.')] });
                return;
            }
            const rawData = Array.isArray(result.data) ? result.data : [result.data];
            if (rawData.length === 0) {
                await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found.')] });
                return;
            }
            tracks = rawData.slice(0, 5);
        }
        else {
            // Parallel multi-platform search — get results from ALL platforms
            const allResults = await (0, resolver_1.searchAllPlatforms)(node, query);
            const platformKeys = Object.keys(allResults);
            if (platformKeys.length === 0) {
                await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found across any platform.')] });
                return;
            }
            // Aggregate top result from each platform, up to 5 total
            for (const prefix of platformKeys) {
                const res = allResults[prefix];
                const data = Array.isArray(res.data) ? res.data : [res.data];
                for (const t of data.slice(0, Math.max(1, Math.floor(5 / platformKeys.length)))) {
                    if (tracks.length >= 5)
                        break;
                    tracks.push({ ...t, _sourcePlatform: prefix });
                }
                if (tracks.length >= 5)
                    break;
            }
            // If we still have room, fill from the first platform with most results
            if (tracks.length < 5) {
                for (const prefix of platformKeys) {
                    const res = allResults[prefix];
                    const data = Array.isArray(res.data) ? res.data : [res.data];
                    for (const t of data) {
                        const isDuplicate = tracks.some(existing => existing.info.title === t.info.title && existing.info.author === t.info.author);
                        if (!isDuplicate && tracks.length < 5) {
                            tracks.push({ ...t, _sourcePlatform: prefix });
                        }
                    }
                }
            }
            searchSource = `${platformKeys.length} platform${platformKeys.length > 1 ? 's' : ''} searched`;
        }
        if (tracks.length === 0) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found.')] });
            return;
        }
        const description = tracks.map((t, i) => {
            const platformTag = t._sourcePlatform ? ` [${resolver_1.PLATFORM_LABELS[t._sourcePlatform] ?? t._sourcePlatform}]` : '';
            return `**${i + 1}.** ${t.info.title} — ${t.info.author}${platformTag}`;
        }).join('\n');
        const embed = (0, embeds_1.createEmbed)({
            color: embeds_1.Colors.Info,
            title: `🔍  Search Results for "${query}"`,
            description,
            footer: `Zorin Music  •  ${searchSource}`,
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('search-select')
            .setPlaceholder('Select a track to play')
            .addOptions(tracks.map((t, i) => ({
            label: t.info.title.substring(0, 100),
            description: `${t.info.author.substring(0, 50)} • ${resolver_1.PLATFORM_LABELS[t._sourcePlatform] ?? t.info.sourceName ?? 'Unknown'}`.substring(0, 100),
            value: i.toString()
        }))));
        await interaction.editReply({ embeds: [embed], components: [row] });
        const collector = interaction.channel?.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id && i.customId === 'search-select',
            time: 30000
        });
        if (!collector)
            return;
        collector.on('collect', async (i) => {
            await i.deferUpdate();
            const selectedIndex = parseInt(i.values[0]);
            const trackData = tracks[selectedIndex];
            let queue = client.queues.get(interaction.guildId);
            if (!queue) {
                queue = await client.createPlayer(interaction.guildId, voiceChannel.id, interaction.guild.shardId, interaction.channelId);
            }
            const track = {
                ...trackData,
                requester: {
                    id: interaction.user.id,
                    username: interaction.user.username,
                    displayName: interaction.user.displayName,
                    avatarURL: interaction.user.displayAvatarURL()
                }
            };
            queue.addTrack(track);
            await interaction.editReply({ embeds: [(0, embeds_1.createTrackAddedEmbed)(track, queue.size)], components: [] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 5000);
            if (!queue.current) {
                const next = queue.nextTrack();
                if (next) {
                    await queue.player.playTrack({ track: { encoded: next.encoded } });
                }
            }
            collector.stop('selected');
        });
        collector.on('end', (_collected, reason) => {
            if (reason !== 'selected') {
                interaction.deleteReply().catch(() => { });
            }
        });
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
        // Check if first arg specifies a source (e.g., !search spotify query OR !search -sp query)
        let sourcePrefix = null;
        let rawQuery = args.join(' ');
        const firstArgKey = args[0].toLowerCase().replace(/^[-/]/, '');
        if (SOURCE_PREFIX_MAP[firstArgKey]) {
            sourcePrefix = SOURCE_PREFIX_MAP[firstArgKey];
            rawQuery = args.slice(1).join(' ');
        }
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
        let result;
        let tracks = [];
        let prefixSearchSource = 'Auto Multi-Platform';
        if (sourcePrefix) {
            result = await node.rest.resolve(`${sourcePrefix}:${rawQuery}`).catch(() => null);
            prefixSearchSource = resolver_1.PLATFORM_LABELS[`${sourcePrefix}:`] ?? sourcePrefix.replace('search', '');
            if (!result || !result.data) {
                const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found for your search.')] });
                setTimeout(() => {
                    err.delete().catch(() => { });
                    message.delete().catch(() => { });
                }, 5000);
                return;
            }
            const rawData = Array.isArray(result.data) ? result.data : [result.data];
            if (rawData.length === 0) {
                const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found.')] });
                setTimeout(() => {
                    err.delete().catch(() => { });
                    message.delete().catch(() => { });
                }, 5000);
                return;
            }
            tracks = rawData.slice(0, 5);
        }
        else {
            // Parallel multi-platform search
            const allResults = await (0, resolver_1.searchAllPlatforms)(node, rawQuery);
            const platformKeys = Object.keys(allResults);
            if (platformKeys.length === 0) {
                const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found across any platform.')] });
                setTimeout(() => {
                    err.delete().catch(() => { });
                    message.delete().catch(() => { });
                }, 5000);
                return;
            }
            // Aggregate top result from each platform, up to 5 total
            for (const prefix of platformKeys) {
                const res = allResults[prefix];
                const data = Array.isArray(res.data) ? res.data : [res.data];
                for (const t of data.slice(0, Math.max(1, Math.floor(5 / platformKeys.length)))) {
                    if (tracks.length >= 5)
                        break;
                    tracks.push({ ...t, _sourcePlatform: prefix });
                }
                if (tracks.length >= 5)
                    break;
            }
            if (tracks.length < 5) {
                for (const prefix of platformKeys) {
                    const res = allResults[prefix];
                    const data = Array.isArray(res.data) ? res.data : [res.data];
                    for (const t of data) {
                        const isDuplicate = tracks.some(existing => existing.info.title === t.info.title && existing.info.author === t.info.author);
                        if (!isDuplicate && tracks.length < 5) {
                            tracks.push({ ...t, _sourcePlatform: prefix });
                        }
                    }
                }
            }
            prefixSearchSource = `${platformKeys.length} platform${platformKeys.length > 1 ? 's' : ''} searched`;
        }
        if (tracks.length === 0) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found.')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const description = tracks.map((t, i) => {
            const platformTag = t._sourcePlatform ? ` [${resolver_1.PLATFORM_LABELS[t._sourcePlatform] ?? t._sourcePlatform}]` : '';
            return `**${i + 1}.** ${t.info.title} — ${t.info.author}${platformTag}`;
        }).join('\n');
        const embed = (0, embeds_1.createEmbed)({
            color: embeds_1.Colors.Info,
            title: `🔍  Search Results for "${rawQuery}"`,
            description,
            footer: `Zorin Music  •  ${prefixSearchSource}`,
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('search-select-prefix')
            .setPlaceholder('Select a track to play')
            .addOptions(tracks.map((t, i) => ({
            label: t.info.title.substring(0, 100),
            description: `${t.info.author.substring(0, 50)} • ${resolver_1.PLATFORM_LABELS[t._sourcePlatform] ?? t.info.sourceName ?? 'Unknown'}`.substring(0, 100),
            value: i.toString()
        }))));
        const replyMessage = await message.reply({ embeds: [embed], components: [row] });
        const collector = message.channel.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.StringSelect,
            filter: i => i.user.id === message.author.id && i.customId === 'search-select-prefix',
            time: 30000
        });
        collector.on('collect', async (i) => {
            await i.deferUpdate();
            const selectedIndex = parseInt(i.values[0]);
            const trackData = tracks[selectedIndex];
            let queue = client.queues.get(message.guildId);
            if (!queue) {
                queue = await client.createPlayer(message.guildId, voiceChannel.id, message.guild.shardId, message.channelId);
            }
            const track = {
                ...trackData,
                requester: {
                    id: message.author.id,
                    username: message.author.username,
                    displayName: message.author.displayName,
                    avatarURL: message.author.displayAvatarURL()
                }
            };
            queue.addTrack(track);
            await replyMessage.edit({ embeds: [(0, embeds_1.createTrackAddedEmbed)(track, queue.size)], components: [] });
            setTimeout(() => {
                replyMessage.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            if (!queue.current) {
                const next = queue.nextTrack();
                if (next) {
                    await queue.player.playTrack({ track: { encoded: next.encoded } });
                }
            }
            collector.stop('selected');
        });
        collector.on('end', (_collected, reason) => {
            if (reason !== 'selected') {
                replyMessage.delete().catch(() => { });
                message.delete().catch(() => { });
            }
        });
    }
};
exports.default = command;
