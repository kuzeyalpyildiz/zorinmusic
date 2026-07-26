import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createErrorEmbed, createSuccessEmbed } from '../../utils/embeds';

const renderVolumeBar = (volume: number): string => {
    const max = 150;
    const size = 15;
    const progress = Math.round((volume / max) * size);
    const emptyProgress = size - progress;

    const progressText = '▓'.repeat(Math.max(0, progress));
    const emptyProgressText = '░'.repeat(Math.max(0, emptyProgress));

    let icon = '🔈';
    if (volume > 80) icon = '🔊';
    else if (volume > 30) icon = '🔉';
    else if (volume === 0) icon = '🔇';

    return `${icon} \`[${progressText}${emptyProgressText}]\` **${volume}%**`;
};

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set or check the player volume')
        .addIntegerOption(option => 
            option.setName('level')
                .setDescription('The volume level (0 - 150)')
                .setMinValue(0)
                .setMaxValue(150)
        ),
    aliases: ['v', 'vol'],
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const client = interaction.client as ZorinClient;
        const member = interaction.member as GuildMember;
        
        if (!member.voice.channel) {
            await interaction.editReply({ embeds: [createErrorEmbed('You need to be in a voice channel!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 3000);
            return;
        }

        const queue = client.queues.get(interaction.guild!.id);
        if (!queue) {
            await interaction.editReply({ embeds: [createErrorEmbed('Nothing is playing right now!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 3000);
            return;
        }

        const vol = interaction.options.getInteger('level');
        if (vol === null) {
            await interaction.editReply({ embeds: [createSuccessEmbed(`Current volume: **${queue.volume}%**\n\n${renderVolumeBar(queue.volume)}`)] });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
            return;
        }

        queue.volume = vol;
        queue.player.setGlobalVolume(vol);

        await interaction.editReply({ embeds: [createSuccessEmbed(`Volume set to **${vol}%**\n\n${renderVolumeBar(vol)}`)] });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
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
