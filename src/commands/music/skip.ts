import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds';

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current playing track'),
    aliases: ['s', 'sk', 'next'],
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
        if (!queue || !queue.current) {
            await interaction.editReply({ embeds: [createErrorEmbed('Nothing is playing right now!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
            return;
        }

        const skippedTitle = queue.current.info.title;
        queue.player.stopTrack();
        await interaction.editReply({ embeds: [createSuccessEmbed(`⏭️ Skipped **${skippedTitle}**`)] });
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
        if (!queue || !queue.current) {
            const err = await message.reply({ embeds: [createErrorEmbed('Nothing is playing right now!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const skippedTitle = queue.current.info.title;
        queue.player.stopTrack();
        const reply = await message.reply({ embeds: [createSuccessEmbed(`⏭️ Skipped **${skippedTitle}**`)] });
        setTimeout(() => {
            reply.delete().catch(() => {});
            message.delete().catch(() => {});
        }, 5000);
    }
};

export default command;
