import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createErrorEmbed, createSuccessEmbed } from '../../utils/embeds';

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggle or set loop mode')
        .addStringOption(option => 
            option.setName('mode')
                .setDescription('The loop mode')
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' }
                )
        ),
    aliases: ['lp'],
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
        if (!queue) {
            await interaction.editReply({ embeds: [createErrorEmbed('Nothing is playing right now!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
            return;
        }

        let mode = interaction.options.getString('mode') as 'off' | 'track' | 'queue' | null;
        
        if (!mode) {
            if (queue.loop === 'off') mode = 'track';
            else if (queue.loop === 'track') mode = 'queue';
            else mode = 'off';
        }

        queue.loop = mode;

        let icon = '▶️';
        if (mode === 'track') icon = '🔁';
        else if (mode === 'queue') icon = '🔂';

        await interaction.editReply({ embeds: [createSuccessEmbed(`${icon} Loop mode set to **${mode}**.`)] });
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

        let mode = args[0]?.toLowerCase();
        
        if (!mode || !['off', 'track', 'queue'].includes(mode)) {
            if (queue.loop === 'off') mode = 'track';
            else if (queue.loop === 'track') mode = 'queue';
            else mode = 'off';
        }

        queue.loop = mode as 'off' | 'track' | 'queue';

        let icon = '▶️';
        if (mode === 'track') icon = '🔁';
        else if (mode === 'queue') icon = '🔂';

        const reply = await message.reply({ embeds: [createSuccessEmbed(`${icon} Loop mode set to **${mode}**.`)] });
        setTimeout(() => {
            reply.delete().catch(() => {});
            message.delete().catch(() => {});
        }, 5000);
    },
};

export default command;
