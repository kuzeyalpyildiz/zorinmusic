import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createErrorEmbed, createSuccessEmbed } from '../../utils/embeds';

const filterPresets: Record<string, any> = {
    none: {},
    bassboost: { equalizer: [{ band: 0, gain: 0.6 }, { band: 1, gain: 0.67 }, { band: 2, gain: 0.67 }, { band: 3, gain: 0.4 }, { band: 4, gain: -0.5 }] },
    nightcore: { timescale: { speed: 1.3, pitch: 1.3, rate: 1.0 } },
    '8d': { rotation: { rotationHz: 0.2 } },
    vaporwave: { timescale: { speed: 0.85, pitch: 0.8, rate: 1.0 }, equalizer: [{ band: 0, gain: 0.3 }, { band: 1, gain: 0.3 }] },
    tremolo: { tremolo: { frequency: 4.0, depth: 0.6 } },
    karaoke: { karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 } },
    pop: { equalizer: [{ band: 0, gain: 0.65 }, { band: 1, gain: 0.45 }, { band: 2, gain: -0.45 }, { band: 3, gain: -0.65 }, { band: 4, gain: -0.35 }] },
    soft: { equalizer: [{ band: 0, gain: 0.0 }, { band: 1, gain: 0.0 }, { band: 2, gain: 0.0 }, { band: 3, gain: 0.0 }, { band: 4, gain: 0.0 }], timescale: { speed: 1.0, pitch: 1.0, rate: 0.8 } },
};

const filterChoices = Object.keys(filterPresets).map(preset => ({ name: preset, value: preset }));

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Apply an audio filter')
        .addStringOption(option => 
            option.setName('preset')
                .setDescription('Filter preset to apply')
                .setRequired(true)
                .addChoices(...filterChoices)
        ),
    aliases: ['f', 'fx', 'eq'],
    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as ZorinClient;
        const member = interaction.member as GuildMember;
        
        if (!member.voice.channel) {
            await interaction.reply({ embeds: [createErrorEmbed('You need to be in a voice channel!')], ephemeral: true });
            return;
        }

        const queue = client.queues.get(interaction.guild!.id);
        if (!queue) {
            await interaction.reply({ embeds: [createErrorEmbed('Nothing is playing right now!')], ephemeral: true });
            return;
        }

        const presetName = interaction.options.getString('preset', true);
        const preset = filterPresets[presetName];

        queue.filter = presetName as any;
        queue.player.setFilters(preset);

        await interaction.reply({ embeds: [createSuccessEmbed(`Filter set to **${presetName}**`)] });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
    },
    async executePrefix(message: Message, args: string[]) {
        const client = message.client as ZorinClient;
        const member = message.member!;
        
        if (!member.voice.channel) {
            const err = await message.reply({ embeds: [createErrorEmbed('You need to be in a voice channel!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const queue = client.queues.get(message.guild!.id);
        if (!queue) {
            const err = await message.reply({ embeds: [createErrorEmbed('Nothing is playing right now!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const presetName = args[0]?.toLowerCase();
        if (!presetName || !filterPresets[presetName]) {
            const err = await message.reply({ embeds: [createErrorEmbed(`Invalid filter! Available filters: \`${Object.keys(filterPresets).join(', ')}\``)] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const preset = filterPresets[presetName];
        queue.filter = presetName as any;
        queue.player.setFilters(preset);

        const reply = await message.reply({ embeds: [createSuccessEmbed(`Filter set to **${presetName}**`)] });
        setTimeout(() => {
            reply.delete().catch(() => {});
            message.delete().catch(() => {});
        }, 5000);
    },
};

export default command;
