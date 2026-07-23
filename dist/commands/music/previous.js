"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('previous')
        .setDescription('Go back to the previously played track'),
    aliases: ['prev', 'back'],
    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            await interaction.reply({ embeds: [(0, embeds_1.createErrorEmbed)('You need to be in a voice channel!')], ephemeral: true });
            return;
        }
        const queue = client.queues.get(interaction.guildId);
        if (!queue) {
            await interaction.reply({ embeds: [(0, embeds_1.createErrorEmbed)('No active queue!')], ephemeral: true });
            return;
        }
        const previousTrack = queue.previousTrack();
        if (!previousTrack) {
            await interaction.reply({ embeds: [(0, embeds_1.createErrorEmbed)('No previous track found in history.')], ephemeral: true });
            return;
        }
        await queue.player.playTrack({ track: { encoded: previousTrack.encoded } });
        await interaction.reply({ embeds: [(0, embeds_1.createSuccessEmbed)(`⏮️ Playing previous track: **${previousTrack.info.title}**`)] });
        setTimeout(() => interaction.deleteReply().catch(() => { }), 5000);
    },
    async executePrefix(message, args) {
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
        const queue = client.queues.get(message.guildId);
        if (!queue) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('No active queue!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const previousTrack = queue.previousTrack();
        if (!previousTrack) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('No previous track found in history.')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        await queue.player.playTrack({ track: { encoded: previousTrack.encoded } });
        const reply = await message.reply({ embeds: [(0, embeds_1.createSuccessEmbed)(`⏮️ Playing previous track: **${previousTrack.info.title}**`)] });
        setTimeout(() => {
            reply.delete().catch(() => { });
            message.delete().catch(() => { });
        }, 5000);
    }
};
exports.default = command;
//# sourceMappingURL=previous.js.map