import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createErrorEmbed, createSuccessEmbed } from '../../utils/embeds';

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a track from the queue')
        .addIntegerOption(option => 
            option.setName('position')
                .setDescription('The position of the track to remove')
                .setRequired(true)
                .setMinValue(1)
        ),
    aliases: ['rm'],
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

        const pos = interaction.options.getInteger('position', true);
        if (pos > queue.tracks.length) {
            await interaction.reply({ embeds: [createErrorEmbed(`Invalid position! There are only ${queue.tracks.length} tracks in the queue.`)], ephemeral: true });
            return;
        }

        const removedTrack = queue.removeTrack(pos - 1);
        if (!removedTrack) {
            await interaction.reply({ embeds: [createErrorEmbed('Failed to remove track.')], ephemeral: true });
            return;
        }

        await interaction.reply({ embeds: [createSuccessEmbed(`Removed **${removedTrack.info.title}** from the queue.`)] });
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

        const pos = parseInt(args[0]);
        if (isNaN(pos) || pos < 1 || pos > queue.tracks.length) {
            const err = await message.reply({ embeds: [createErrorEmbed(`Please provide a valid position between 1 and ${queue.tracks.length}.`)] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const removedTrack = queue.removeTrack(pos - 1);
        if (!removedTrack) {
            const err = await message.reply({ embeds: [createErrorEmbed('Failed to remove track.')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const reply = await message.reply({ embeds: [createSuccessEmbed(`Removed **${removedTrack.info.title}** from the queue.`)] });
        setTimeout(() => {
            reply.delete().catch(() => {});
            message.delete().catch(() => {});
        }, 5000);
    },
};

export default command;
