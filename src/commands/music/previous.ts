import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds';

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('previous')
        .setDescription('Play the previous track from history'),
    aliases: ['prev', 'back'],
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const client = interaction.client as ZorinClient;
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            await interaction.editReply({ embeds: [createErrorEmbed('You need to be in a voice channel!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
            return;
        }

        const queue = client.queues.get(interaction.guildId!);
        if (!queue) {
            await interaction.editReply({ embeds: [createErrorEmbed('No active queue!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
            return;
        }

        const previousTrack = queue.previousTrack();
        if (!previousTrack) {
            await interaction.editReply({ embeds: [createErrorEmbed('No previous track found in history.')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
            return;
        }

        await queue.player.playTrack({ track: { encoded: previousTrack.encoded } });
        await interaction.editReply({ embeds: [createSuccessEmbed(`⏮️ Playing previous track: **${previousTrack.info.title}**`)] });
        setTimeout(() => {
            interaction.deleteReply().catch(() => {});
        }, 5000);
    },
    async executePrefix(message: Message, args: string[]) {
        const client = message.client as ZorinClient;
        const member = message.member!;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            const err = await message.reply({ embeds: [createErrorEmbed('You need to be in a voice channel!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const queue = client.queues.get(message.guildId!);
        if (!queue) {
            const err = await message.reply({ embeds: [createErrorEmbed('No active queue!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const previousTrack = queue.previousTrack();
        if (!previousTrack) {
            const err = await message.reply({ embeds: [createErrorEmbed('No previous track found in history.')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        await queue.player.playTrack({ track: { encoded: previousTrack.encoded } });
        const reply = await message.reply({ embeds: [createSuccessEmbed(`⏮️ Playing previous track: **${previousTrack.info.title}**`)] });
        setTimeout(() => {
            reply.delete().catch(() => {});
            message.delete().catch(() => {});
        }, 5000);
    }
};

export default command;
