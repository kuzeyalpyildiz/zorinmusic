"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume a paused track'),
    aliases: ['rs', 'unpause'],
    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            await interaction.reply({ embeds: [(0, embeds_1.createErrorEmbed)('You need to be in a voice channel!')], ephemeral: true });
            return;
        }
        const queue = client.queues.get(interaction.guildId);
        if (!queue || !queue.current) {
            await interaction.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')], ephemeral: true });
            return;
        }
        if (!queue.paused) {
            await interaction.reply({ embeds: [(0, embeds_1.createErrorEmbed)('The track is not paused!')], ephemeral: true });
            return;
        }
        queue.paused = false;
        queue.player.setPaused(false);
        await interaction.reply({ embeds: [(0, embeds_1.createSuccessEmbed)('▶️ Resumed the current track.')] });
        setTimeout(() => {
            interaction.deleteReply().catch(() => { });
        }, 5000);
    },
    async executePrefix(message, args) {
        const client = message.client;
        const member = message.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            const errReply = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('You need to be in a voice channel!')] });
            setTimeout(() => {
                errReply.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const queue = client.queues.get(message.guild.id);
        if (!queue || !queue.current) {
            const errReply = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')] });
            setTimeout(() => {
                errReply.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        if (!queue.paused) {
            const errReply = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('The track is not paused!')] });
            setTimeout(() => {
                errReply.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        queue.paused = false;
        queue.player.setPaused(false);
        const reply = await message.reply({ embeds: [(0, embeds_1.createSuccessEmbed)('▶️ Resumed the current track.')] });
        setTimeout(() => {
            reply.delete().catch(() => { });
            message.delete().catch(() => { });
        }, 5000);
    }
};
exports.default = command;
//# sourceMappingURL=resume.js.map