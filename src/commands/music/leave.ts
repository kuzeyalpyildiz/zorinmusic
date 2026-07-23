import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds';

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Disconnect from voice channel'),
    aliases: ['l', 'bye'],
    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as ZorinClient;
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            await interaction.reply({ embeds: [createErrorEmbed('You need to be in a voice channel!')], ephemeral: true });
            return;
        }

        const queue = client.queues.get(interaction.guildId!);
        if (!queue) {
            await interaction.reply({ embeds: [createErrorEmbed('I am not in a voice channel!')], ephemeral: true });
            return;
        }

        client.destroyPlayer(interaction.guildId!);
        await interaction.reply({ embeds: [createSuccessEmbed('👋 Left the voice channel.')] });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
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
            const err = await message.reply({ embeds: [createErrorEmbed('I am not in a voice channel!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        client.destroyPlayer(message.guildId!);
        const reply = await message.reply({ embeds: [createSuccessEmbed('👋 Left the voice channel.')] });
        setTimeout(() => {
            reply.delete().catch(() => {});
            message.delete().catch(() => {});
        }, 5000);
    }
};

export default command;
