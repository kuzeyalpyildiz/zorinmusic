"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const buildHelpEmbed = (client) => {
    const embed = (0, embeds_1.createEmbed)({
        color: embeds_1.Colors.Primary,
        author: { name: '📖  Zorin Music — Commands' },
        description: [
            '**🎵 Music Commands**',
            '`/play` — Play a track or playlist',
            '`/search` — Search for a track',
            '`/pause` — Pause the player',
            '`/resume` — Resume the player',
            '`/skip` — Skip to the next track',
            '`/previous` — Play the previous track',
            '`/stop` — Stop the player',
            '`/leave` — Leave the voice channel',
            '`/nowplaying` — Show the currently playing track',
            '`/queue` — Display the queue',
            '`/remove` — Remove a track from the queue',
            '`/loop` — Cycle or set loop mode',
            '`/shuffle` — Shuffle the queue',
            '`/volume` — Set the volume',
            '`/filter` — Apply an audio filter',
            '`/fix` — Repair voice connection/player',
            '',
            '**⚙️ Utility Commands**',
            '`/help` — Show this help menu',
            '',
            '> All commands also work with the `!` prefix.',
        ].join('\n'),
        footer: 'Zorin Music  •  Press Delete Menu below to dismiss',
    });
    return embed;
};
const getDeleteRow = () => {
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('help-delete')
        .setLabel('Delete Menu')
        .setEmoji('🗑️')
        .setStyle(discord_js_1.ButtonStyle.Danger));
};
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('help')
        .setDescription('List all commands'),
    aliases: ['h', 'commands'],
    async execute(interaction) {
        const client = interaction.client;
        const response = await interaction.reply({
            embeds: [buildHelpEmbed(client)],
            components: [getDeleteRow()],
            fetchReply: true
        });
        const collector = response.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            filter: i => i.customId === 'help-delete',
        });
        collector.on('collect', async (i) => {
            await i.deferUpdate().catch(() => { });
            interaction.deleteReply().catch(() => { });
            collector.stop();
        });
    },
    async executePrefix(message, args) {
        const client = message.client;
        const reply = await message.reply({
            embeds: [buildHelpEmbed(client)],
            components: [getDeleteRow()],
        });
        const collector = reply.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            filter: i => i.customId === 'help-delete',
        });
        collector.on('collect', async (i) => {
            await i.deferUpdate().catch(() => { });
            reply.delete().catch(() => { });
            collector.stop();
        });
    },
};
exports.default = command;
//# sourceMappingURL=help.js.map