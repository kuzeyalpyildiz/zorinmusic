import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createErrorEmbed, createSuccessEmbed } from '../../utils/embeds';

const renderVolumeBar = (vol: number) => {
    const bars = Math.round(vol / 10);
    const safeBars = Math.min(Math.max(bars, 0), 15);
    return '🟩'.repeat(safeBars) + '⬛'.repeat(15 - safeBars);
};

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set the player volume')
        .addIntegerOption(option => 
            option.setName('level')
                .setDescription('Volume level (0-150)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(150)
        ),
    aliases: ['v', 'vol'],
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

        const vol = interaction.options.getInteger('level', true);
        queue.volume = vol;
        queue.player.setGlobalVolume(vol);

        await interaction.reply({ embeds: [createSuccessEmbed(`Volume set to **${vol}%**\n\n${renderVolumeBar(vol)}`)] });
        setTimeout(() => {
            interaction.deleteReply().catch(() => {});
        }, 3000);
    },
    async executePrefix(message: Message, args: string[]) {
        const client = message.client as ZorinClient;
        const member = message.member!;
        
        if (!member.voice.channel) {
            const err = await message.reply({ embeds: [createErrorEmbed('You need to be in a voice channel!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 3000);
            return;
        }

        const queue = client.queues.get(message.guild!.id);
        if (!queue) {
            const err = await message.reply({ embeds: [createErrorEmbed('Nothing is playing right now!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 3000);
            return;
        }

        const volStr = args[0];
        if (!volStr) {
            const info = await message.reply({ embeds: [createSuccessEmbed(`Current volume: **${queue.volume}%**\n\n${renderVolumeBar(queue.volume)}`)] });
            setTimeout(() => {
                info.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 3000);
            return;
        }

        const vol = parseInt(volStr);
        if (isNaN(vol) || vol < 0 || vol > 150) {
            const err = await message.reply({ embeds: [createErrorEmbed('Please provide a valid volume between 0 and 150!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 3000);
            return;
        }

        queue.volume = vol;
        queue.player.setGlobalVolume(vol);

        const reply = await message.reply({ embeds: [createSuccessEmbed(`Volume set to **${vol}%**\n\n${renderVolumeBar(vol)}`)] });
        setTimeout(() => {
            reply.delete().catch(() => {});
            message.delete().catch(() => {});
        }, 3000);
    },
};

export default command;
