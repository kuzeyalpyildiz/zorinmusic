"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current track'),
    aliases: ['s', 'sk', 'next'],
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
        const skippedTitle = queue.current.info.title;
        queue.player.stopTrack(); // Emits end event which plays next
        await interaction.reply({ embeds: [(0, embeds_1.createSuccessEmbed)(`⏭️ Skipped **${skippedTitle}**`)] });
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
        if (!queue || !queue.current) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const skippedTitle = queue.current.info.title;
        queue.player.stopTrack();
        const reply = await message.reply({ embeds: [(0, embeds_1.createSuccessEmbed)(`⏭️ Skipped **${skippedTitle}**`)] });
        setTimeout(() => {
            reply.delete().catch(() => { });
            message.delete().catch(() => { });
        }, 5000);
    }
};
exports.default = command;
//# sourceMappingURL=skip.js.map