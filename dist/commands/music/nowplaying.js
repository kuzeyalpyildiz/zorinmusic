"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Display the currently playing track'),
    aliases: ['np', 'now', 'playing'],
    async execute(interaction) {
        await interaction.deferReply();
        const client = interaction.client;
        const queue = client.queues.get(interaction.guildId);
        if (!queue || !queue.current) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 5000);
            return;
        }
        await interaction.editReply({ embeds: [(0, embeds_1.createNowPlayingEmbed)(queue.current, queue.player.position)] });
    },
    async executePrefix(message, args) {
        const client = message.client;
        const queue = client.queues.get(message.guildId);
        if (!queue || !queue.current) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        await message.reply({ embeds: [(0, embeds_1.createNowPlayingEmbed)(queue.current, queue.player.position)] });
    }
};
exports.default = command;
