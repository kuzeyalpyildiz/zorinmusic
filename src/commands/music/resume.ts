import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds';

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume a paused track'),
    aliases: ['rs', 'unpause'],
    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as ZorinClient;
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            await interaction.reply({ embeds: [createErrorEmbed('You need to be in a voice channel!')], ephemeral: true });
            return;
        }

        const queue = client.queues.get(interaction.guildId!);
        if (!queue || !queue.current) {
            await interaction.reply({ embeds: [createErrorEmbed('Nothing is playing right now!')], ephemeral: true });
            return;
        }

        if (!queue.paused) {
            await interaction.reply({ embeds: [createErrorEmbed('The track is not paused!')], ephemeral: true });
            return;
        }

        queue.paused = false;
        queue.player.setPaused(false);
        await interaction.reply({ embeds: [createSuccessEmbed('▶️ Resumed the current track.')] });
        setTimeout(() => {
            interaction.deleteReply().catch(() => {});
        }, 5000);
    },
    async executePrefix(message: Message, args: string[]) {
        const client = message.client as ZorinClient;
        const member = message.member!;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            const errReply = await message.reply({ embeds: [createErrorEmbed('You need to be in a voice channel!')] });
            setTimeout(() => {
                errReply.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const queue = client.queues.get(message.guild!.id);
        if (!queue || !queue.current) {
            const errReply = await message.reply({ embeds: [createErrorEmbed('Nothing is playing right now!')] });
            setTimeout(() => {
                errReply.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        if (!queue.paused) {
            const errReply = await message.reply({ embeds: [createErrorEmbed('The track is not paused!')] });
            setTimeout(() => {
                errReply.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        queue.paused = false;
        queue.player.setPaused(false);
        const reply = await message.reply({ embeds: [createSuccessEmbed('▶️ Resumed the current track.')] });
        setTimeout(() => {
            reply.delete().catch(() => {});
            message.delete().catch(() => {});
        }, 5000);
    }
};

export default command;
