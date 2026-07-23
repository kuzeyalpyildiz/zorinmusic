"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the upcoming queue'),
    aliases: ['sh', 'mix'],
    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        if (!member.voice.channel) {
            await interaction.reply({ embeds: [(0, embeds_1.createErrorEmbed)('You need to be in a voice channel!')], ephemeral: true });
            return;
        }
        const queue = client.queues.get(interaction.guild.id);
        if (!queue || queue.tracks.length < 2) {
            await interaction.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Not enough tracks in the queue to shuffle!')], ephemeral: true });
            return;
        }
        queue.shuffle();
        await interaction.reply({ embeds: [(0, embeds_1.createSuccessEmbed)('🔀 Shuffled the queue!')] });
        setTimeout(() => interaction.deleteReply().catch(() => { }), 5000);
    },
    async executePrefix(message, args) {
        const client = message.client;
        const member = message.member;
        if (!member.voice.channel) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('You need to be in a voice channel!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const queue = client.queues.get(message.guild.id);
        if (!queue || queue.tracks.length < 2) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Not enough tracks in the queue to shuffle!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        queue.shuffle();
        const reply = await message.reply({ embeds: [(0, embeds_1.createSuccessEmbed)('🔀 Shuffled the queue!')] });
        setTimeout(() => {
            reply.delete().catch(() => { });
            message.delete().catch(() => { });
        }, 5000);
    },
};
exports.default = command;
//# sourceMappingURL=shuffle.js.map