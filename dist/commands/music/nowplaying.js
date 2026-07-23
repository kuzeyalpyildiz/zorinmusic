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
        const client = interaction.client;
        const queue = client.queues.get(interaction.guildId);
        if (!queue || !queue.current) {
            await interaction.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')], ephemeral: true });
            return;
        }
        await interaction.reply({ embeds: [(0, embeds_1.createNowPlayingEmbed)(queue.current, queue.player.position)] });
    },
    async executePrefix(message, args) {
        const client = message.client;
        const queue = client.queues.get(message.guildId);
        if (!queue || !queue.current) {
            await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')] });
            return;
        }
        await message.reply({ embeds: [(0, embeds_1.createNowPlayingEmbed)(queue.current, queue.player.position)] });
    }
};
exports.default = command;
//# sourceMappingURL=nowplaying.js.map