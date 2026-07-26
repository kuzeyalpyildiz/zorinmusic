"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playback, clear queue, and leave voice channel'),
    aliases: ['st', 'dc'],
    async execute(interaction) {
        await interaction.deferReply();
        const client = interaction.client;
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('You need to be in a voice channel!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 5000);
            return;
        }
        const queue = client.queues.get(interaction.guildId);
        if (!queue) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 5000);
            return;
        }
        client.destroyPlayer(interaction.guildId);
        await interaction.editReply({ embeds: [(0, embeds_1.createSuccessEmbed)('⏹️ Stopped playback and disconnected from the voice channel.')] });
        setTimeout(() => {
            interaction.deleteReply().catch(() => { });
        }, 5000);
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
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        client.destroyPlayer(message.guildId);
        const reply = await message.reply({ embeds: [(0, embeds_1.createSuccessEmbed)('⏹️ Stopped playback and disconnected from the voice channel.')] });
        setTimeout(() => {
            reply.delete().catch(() => { });
            message.delete().catch(() => { });
        }, 5000);
    }
};
exports.default = command;
//# sourceMappingURL=stop.js.map