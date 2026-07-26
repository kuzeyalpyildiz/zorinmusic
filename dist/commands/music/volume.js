"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const renderVolumeBar = (volume) => {
    const max = 150;
    const size = 15;
    const progress = Math.round((volume / max) * size);
    const emptyProgress = size - progress;
    const progressText = '▓'.repeat(Math.max(0, progress));
    const emptyProgressText = '░'.repeat(Math.max(0, emptyProgress));
    let icon = '🔈';
    if (volume > 80)
        icon = '🔊';
    else if (volume > 30)
        icon = '🔉';
    else if (volume === 0)
        icon = '🔇';
    return `${icon} \`[${progressText}${emptyProgressText}]\` **${volume}%**`;
};
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set or check the player volume')
        .addIntegerOption(option => option.setName('level')
        .setDescription('The volume level (0 - 150)')
        .setMinValue(0)
        .setMaxValue(150)),
    aliases: ['v', 'vol'],
    async execute(interaction) {
        await interaction.deferReply();
        const client = interaction.client;
        const member = interaction.member;
        if (!member.voice.channel) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('You need to be in a voice channel!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 3000);
            return;
        }
        const queue = client.queues.get(interaction.guild.id);
        if (!queue) {
            await interaction.editReply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => { });
            }, 3000);
            return;
        }
        const vol = interaction.options.getInteger('level');
        if (vol === null) {
            await interaction.editReply({ embeds: [(0, embeds_1.createSuccessEmbed)(`Current volume: **${queue.volume}%**\n\n${renderVolumeBar(queue.volume)}`)] });
            setTimeout(() => interaction.deleteReply().catch(() => { }), 3000);
            return;
        }
        queue.volume = vol;
        queue.player.setGlobalVolume(vol);
        await interaction.editReply({ embeds: [(0, embeds_1.createSuccessEmbed)(`Volume set to **${vol}%**\n\n${renderVolumeBar(vol)}`)] });
        setTimeout(() => interaction.deleteReply().catch(() => { }), 3000);
    },
    async executePrefix(message, args) {
        const client = message.client;
        const member = message.member;
        if (!member.voice.channel) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('You need to be in a voice channel!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 3000);
            return;
        }
        const queue = client.queues.get(message.guild.id);
        if (!queue) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Nothing is playing right now!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 3000);
            return;
        }
        const volStr = args[0];
        if (!volStr) {
            const info = await message.reply({ embeds: [(0, embeds_1.createSuccessEmbed)(`Current volume: **${queue.volume}%**\n\n${renderVolumeBar(queue.volume)}`)] });
            setTimeout(() => {
                info.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 3000);
            return;
        }
        const vol = parseInt(volStr);
        if (isNaN(vol) || vol < 0 || vol > 150) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)('Please provide a valid volume between 0 and 150!')] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 3000);
            return;
        }
        queue.volume = vol;
        queue.player.setGlobalVolume(vol);
        const reply = await message.reply({ embeds: [(0, embeds_1.createSuccessEmbed)(`Volume set to **${vol}%**\n\n${renderVolumeBar(vol)}`)] });
        setTimeout(() => {
            reply.delete().catch(() => { });
            message.delete().catch(() => { });
        }, 3000);
    },
};
exports.default = command;
//# sourceMappingURL=volume.js.map