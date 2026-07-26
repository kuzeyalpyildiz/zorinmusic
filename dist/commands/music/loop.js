"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggle or set loop mode')
        .addStringOption(option => option.setName('mode')
        .setDescription('The loop mode')
        .addChoices({ name: 'Off', value: 'off' }, { name: 'Track', value: 'track' }, { name: 'Queue', value: 'queue' })),
    aliases: ['lp'],
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
        let mode = interaction.options.getString('mode');
        if (!mode) {
            if (queue.loop === 'off')
                mode = 'track';
            else if (queue.loop === 'track')
                mode = 'queue';
            else
                mode = 'off';
        }
        queue.loop = mode;
        let icon = '▶️';
        if (mode === 'track')
            icon = '🔁';
        else if (mode === 'queue')
            icon = '🔂';
        await interaction.editReply({ embeds: [(0, embeds_1.createSuccessEmbed)(`${icon} Loop mode set to **${mode}**.`)] });
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
        let mode = args[0]?.toLowerCase();
        if (!mode || !['off', 'track', 'queue'].includes(mode)) {
            if (queue.loop === 'off')
                mode = 'track';
            else if (queue.loop === 'track')
                mode = 'queue';
            else
                mode = 'off';
        }
        queue.loop = mode;
        let icon = '▶️';
        if (mode === 'track')
            icon = '🔁';
        else if (mode === 'queue')
            icon = '🔂';
        const reply = await message.reply({ embeds: [(0, embeds_1.createSuccessEmbed)(`${icon} Loop mode set to **${mode}**.`)] });
        setTimeout(() => {
            reply.delete().catch(() => { });
            message.delete().catch(() => { });
        }, 5000);
    },
};
exports.default = command;
//# sourceMappingURL=loop.js.map