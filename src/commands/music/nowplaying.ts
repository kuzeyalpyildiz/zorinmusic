import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createNowPlayingEmbed, createErrorEmbed } from '../../utils/embeds';

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Display the currently playing track'),
    aliases: ['np', 'now', 'playing'],
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const client = interaction.client as ZorinClient;
        const queue = client.queues.get(interaction.guildId!);

        if (!queue || !queue.current) {
            await interaction.editReply({ embeds: [createErrorEmbed('Nothing is playing right now!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
            return;
        }

        await interaction.editReply({ embeds: [createNowPlayingEmbed(queue.current, queue.player.position)] });
    },
    async executePrefix(message: Message, args: string[]) {
        const client = message.client as ZorinClient;
        const queue = client.queues.get(message.guildId!);

        if (!queue || !queue.current) {
            const err = await message.reply({ embeds: [createErrorEmbed('Nothing is playing right now!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        await message.reply({ embeds: [createNowPlayingEmbed(queue.current, queue.player.position)] });
    }
};

export default command;
