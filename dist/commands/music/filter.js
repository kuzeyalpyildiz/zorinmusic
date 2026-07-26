"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const embeds_1 = require("../../utils/embeds");
const filterPresets = {
    none: {},
    bassboost: {
        equalizer: [
            { band: 0, gain: 0.2 },
            { band: 1, gain: 0.15 },
            { band: 2, gain: 0.1 },
        ],
    },
    nightcore: {
        timescale: { speed: 1.15, pitch: 1.15, rate: 1.0 },
    },
    '8d': {
        rotation: { rotationHz: 0.2 },
    },
    vaporwave: {
        timescale: { speed: 0.85, pitch: 0.8, rate: 1.0 },
    },
    tremolo: {
        tremolo: { frequency: 4.0, depth: 0.5 },
    },
    karaoke: {
        karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 },
    },
    pop: {
        equalizer: [
            { band: 0, gain: -0.05 },
            { band: 1, gain: 0.1 },
            { band: 2, gain: 0.2 },
            { band: 3, gain: 0.1 },
            { band: 4, gain: 0.0 },
        ],
    },
    soft: {
        lowPass: { smoothing: 20.0 },
    },
};
const command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('filter')
        .setDescription('Apply an audio filter')
        .addStringOption(option => option.setName('preset')
        .setDescription('The audio filter preset')
        .setRequired(true)
        .addChoices({ name: 'None (Clear Filters)', value: 'none' }, { name: '🔊 Bassboost', value: 'bassboost' }, { name: '⚡ Nightcore', value: 'nightcore' }, { name: '🎧 8D Spatial', value: '8d' }, { name: '🌴 Vaporwave', value: 'vaporwave' }, { name: '〰️ Tremolo', value: 'tremolo' }, { name: '🎤 Karaoke', value: 'karaoke' }, { name: '🎉 Pop', value: 'pop' }, { name: '☕ Soft', value: 'soft' })),
    aliases: ['f', 'fx', 'eq'],
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
        const presetName = interaction.options.getString('preset', true);
        const preset = filterPresets[presetName];
        queue.filter = presetName;
        queue.player.setFilters(preset);
        await interaction.editReply({ embeds: [(0, embeds_1.createSuccessEmbed)(`Filter set to **${presetName}**`)] });
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
        const presetName = args[0]?.toLowerCase();
        if (!presetName || !filterPresets[presetName]) {
            const err = await message.reply({ embeds: [(0, embeds_1.createErrorEmbed)(`Invalid filter! Available filters: \`${Object.keys(filterPresets).join(', ')}\``)] });
            setTimeout(() => {
                err.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 5000);
            return;
        }
        const preset = filterPresets[presetName];
        queue.filter = presetName;
        queue.player.setFilters(preset);
        const reply = await message.reply({ embeds: [(0, embeds_1.createSuccessEmbed)(`Filter set to **${presetName}**`)] });
        setTimeout(() => {
            reply.delete().catch(() => { });
            message.delete().catch(() => { });
        }, 5000);
    },
};
exports.default = command;
