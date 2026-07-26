"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a track from the queue')
        .addIntegerOption(option => option.setName('position')
        .setDescription('The position of the track to remove')
        .setRequired(true)
        .setMinValue(1)),
    aliases: ['rm'],
    async execute(interaction) {
        await interaction.deferReply();
        const client = interaction.client;
        const member = interaction.member;
        if (!member.voice.channel) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('You need to be in a voice channel!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 5000);
            return;
        }
        const queue = client.queues.get(interaction.guild.id);
        if (!queue) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 5000);
            return;
        }
        const pos = interaction.options.getInteger('position', true);
        if (pos > queue.tracks.length) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)(`Invalid position! There are only ${queue.tracks.length} tracks in the queue.`)] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 5000);
            return;
        }
        const removedTrack = queue.removeTrack(pos - 1);
        if (!removedTrack) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('Failed to remove track.')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 5000);
            return;
        }
        await interaction.editReply({ embeds: [(0, embeds_1.createSuccessEmbed)(`Removed **${removedTrack.info.title}** from the queue.`)] });
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
        if (!queue) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const pos = parseInt(args[0]);
        if (isNaN(pos) || pos < 1 || pos > queue.tracks.length) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)(`Please provide a valid position between 1 and ${queue.tracks.length}.`)] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const removedTrack = queue.removeTrack(pos - 1);
        if (!removedTrack) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Failed to remove track.')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const reply = await message.reply({ embeds: [(0, embeds_1.createSuccessEmbed)(`Removed **${removedTrack.info.title}** from the queue.`)] });
        setTimeout(() => {
            reply.delete().catch(() => { });
            message.delete().catch(() => { });
        }, 5000);
    },
};
exports.default = command;
//# sourceMappingURL=remove.js.map