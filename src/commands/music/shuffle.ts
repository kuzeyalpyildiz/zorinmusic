import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createErrorEmbed, createSuccessEmbed } from '../../utils/embeds';

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the upcoming tracks in the queue'),
    aliases: ['sh', 'mix'],
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const client = interaction.client as ZorinClient;
        const member = interaction.member as GuildMember;
        
        if (!member.voice.channel) {
            await interaction.editReply({ embeds: [createErrorEmbed('You need to be in a voice channel!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
            return;
        }

        const queue = client.queues.get(interaction.guild!.id);
        if (!queue || queue.tracks.length < 2) {
            await interaction.editReply({ embeds: [createErrorEmbed('Not enough tracks in the queue to shuffle!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
            return;
        }

        queue.shuffle();

        await interaction.editReply({ embeds: [createSuccessEmbed('🔀 Shuffled the queue!')] });
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
        if (!queue || queue.tracks.length < 2) {
            const err = await message.reply({ embeds: [createErrorEmbed('Not enough tracks in the queue to shuffle!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        queue.shuffle();

        const reply = await message.reply({ embeds: [createSuccessEmbed('🔀 Shuffled the queue!')] });
        setTimeout(() => {
            reply.delete().catch(() => {});
            message.delete().catch(() => {});
        }, 5000);
    },
};

export default command;
