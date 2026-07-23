"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const buildQueueComponents = (queue, currentPage, totalPages) => {
    const rows = [];
    // Row 1: Action & Navigation Buttons
    const buttonRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('q_prev')
        .setEmoji('◀️')
        .setLabel('Prev')
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(currentPage <= 1), new discord_js_1.ButtonBuilder()
        .setCustomId('q_shuffle')
        .setEmoji('🔀')
        .setLabel('Shuffle')
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(queue.tracks.length < 2), new discord_js_1.ButtonBuilder()
        .setCustomId('q_clear')
        .setEmoji('🗑️')
        .setLabel('Clear Queue')
        .setStyle(discord_js_1.ButtonStyle.Danger)
        .setDisabled(queue.tracks.length === 0), new discord_js_1.ButtonBuilder()
        .setCustomId('q_next')
        .setEmoji('▶️')
        .setLabel('Next')
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages));
    rows.push(buttonRow);
    // Row 2: Remove Track Select Menu (if tracks exist on current page)
    const tracksPerPage = 10;
    const start = (currentPage - 1) * tracksPerPage;
    const pageTracks = queue.tracks.slice(start, start + tracksPerPage);
    if (pageTracks.length > 0) {
        const selectMenu = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('q_remove_select')
            .setPlaceholder('❌ Select a track to remove from queue…')
            .addOptions(pageTracks.map((track, i) => ({
            label: `${start + i + 1}. ${track.info.title.substring(0, 80)}`,
            description: track.info.author.substring(0, 80),
            value: (start + i).toString(),
        })));
        rows.push(new discord_js_1.ActionRowBuilder().addComponents(selectMenu));
    }
    return rows;
};
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display and interactively manage the music queue')
        .addIntegerOption(option => option.setName('page')
        .setDescription('The page number to view')
        .setMinValue(1)),
    aliases: ['q'],
    async execute(interaction) {
        const client = interaction.client;
        const queue = client.queues.get(interaction.guild.id);
        if (!queue || (!queue.current && queue.tracks.length === 0)) {
            await interaction.reply({ embeds: [(0, embeds_1.createErrorEmbed)('The queue is empty!')], ephemeral: true });
            return;
        }
        let page = interaction.options.getInteger('page') || 1;
        let totalPages = Math.ceil(queue.tracks.length / 10) || 1;
        if (page > totalPages)
            page = totalPages;
        const response = await interaction.reply({
            embeds: [(0, embeds_1.createQueueEmbed)(queue, page)],
            components: buildQueueComponents(queue, page, totalPages),
            fetchReply: true
        });
        const collector = response.createMessageComponentCollector({ time: 30000 });
        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: 'You are not controlling this menu.', ephemeral: true });
                return;
            }
            await i.deferUpdate();
            if (i.customId === 'q_prev') {
                page = Math.max(1, page - 1);
            }
            else if (i.customId === 'q_next') {
                page = Math.min(totalPages, page + 1);
            }
            else if (i.customId === 'q_shuffle') {
                queue.shuffle();
            }
            else if (i.customId === 'q_clear') {
                queue.clear();
                page = 1;
            }
            else if (i.customId === 'q_remove_select' && i.isStringSelectMenu()) {
                const removeIdx = parseInt(i.values[0]);
                queue.removeTrack(removeIdx);
            }
            totalPages = Math.ceil(queue.tracks.length / 10) || 1;
            if (page > totalPages)
                page = totalPages;
            await interaction.editReply({
                embeds: [(0, embeds_1.createQueueEmbed)(queue, page)],
                components: buildQueueComponents(queue, page, totalPages)
            }).catch(() => { });
        });
        collector.on('end', () => {
            interaction.deleteReply().catch(() => { });
        });
    },
    async executePrefix(message, args) {
        const client = message.client;
        const queue = client.queues.get(message.guild.id);
        if (!queue || (!queue.current && queue.tracks.length === 0)) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('The queue is empty!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        let page = parseInt(args[0]) || 1;
        let totalPages = Math.ceil(queue.tracks.length / 10) || 1;
        if (page > totalPages)
            page = totalPages;
        const response = await message.reply({
            embeds: [(0, embeds_1.createQueueEmbed)(queue, page)],
            components: buildQueueComponents(queue, page, totalPages)
        });
        const collector = response.createMessageComponentCollector({ time: 30000 });
        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) {
                await i.reply({ content: 'You are not controlling this menu.', ephemeral: true });
                return;
            }
            await i.deferUpdate();
            if (i.customId === 'q_prev') {
                page = Math.max(1, page - 1);
            }
            else if (i.customId === 'q_next') {
                page = Math.min(totalPages, page + 1);
            }
            else if (i.customId === 'q_shuffle') {
                queue.shuffle();
            }
            else if (i.customId === 'q_clear') {
                queue.clear();
                page = 1;
            }
            else if (i.customId === 'q_remove_select' && i.isStringSelectMenu()) {
                const removeIdx = parseInt(i.values[0]);
                queue.removeTrack(removeIdx);
            }
            totalPages = Math.ceil(queue.tracks.length / 10) || 1;
            if (page > totalPages)
                page = totalPages;
            await response.edit({
                embeds: [(0, embeds_1.createQueueEmbed)(queue, page)],
                components: buildQueueComponents(queue, page, totalPages)
            }).catch(() => { });
        });
        collector.on('end', () => {
            response.delete().catch(() => { });
            message.delete().catch(() => { });
        });
    },
};
exports.default = command;
//# sourceMappingURL=queue.js.map