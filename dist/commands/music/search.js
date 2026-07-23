"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const resolver_1 = require("../../utils/resolver");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for a track across platforms and select from top 5 results')
        .addStringOption(option => option.setName('query')
        .setDescription('The track to search for')
        .setRequired(true)),
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
        const node = client.getNode();
        const result = await (0, resolver_1.smartResolve)(node, query);
        if (!result || !result.data) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found across platforms.')] });
            return;
        }
        const rawData = Array.isArray(result.data) ? result.data : [result.data];
        const tracks = rawData.slice(0, 5);
        const description = tracks.map((t, i) => `**${i + 1}.** ${t.info.title} — ${t.info.author}`).join('\n');
        const embed = (0, embeds_1.createEmbed)({
            color: embeds_1.Colors.Info,
            title: `🔍  Search Results for "${query}"`,
            description,
            footer: 'Zorin Music  •  Select a track from the menu below within 30 seconds',
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('search-select')
            .setPlaceholder('Select a track to play')
            .addOptions(tracks.map((t, i) => ({
            label: t.info.title.substring(0, 100),
            description: t.info.author.substring(0, 100),
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
        const query = args.join(' ');
        const node = client.getNode();
        const result = await (0, resolver_1.smartResolve)(node, query);
        if (!result || !result.data) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('No results found across platforms.')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const rawData = Array.isArray(result.data) ? result.data : [result.data];
        const tracks = rawData.slice(0, 5);
        const description = tracks.map((t, i) => `**${i + 1}.** ${t.info.title} — ${t.info.author}`).join('\n');
        const embed = (0, embeds_1.createEmbed)({
            color: embeds_1.Colors.Info,
            title: `🔍  Search Results for "${query}"`,
            description,
            footer: 'Zorin Music  •  Select a track from the menu below within 30 seconds',
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('search-select-prefix')
            .setPlaceholder('Select a track to play')
            .addOptions(tracks.map((t, i) => ({
            label: t.info.title.substring(0, 100),
            description: t.info.author.substring(0, 100),
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
//# sourceMappingURL=search.js.map