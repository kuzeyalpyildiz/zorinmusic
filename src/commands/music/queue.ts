import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    Message, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ComponentType 
} from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { MusicQueue } from '../../structures/MusicQueue';
import { ZorinCommand } from '../../types';
import { createErrorEmbed, createQueueEmbed, createSuccessEmbed } from '../../utils/embeds';

const buildQueueComponents = (queue: MusicQueue, currentPage: number, totalPages: number) => {
    const rows: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [];

    // Row 1: Action & Navigation Buttons
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('q_prev')
            .setEmoji('◀️')
            .setLabel('Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage <= 1),
        new ButtonBuilder()
            .setCustomId('q_shuffle')
            .setEmoji('🔀')
            .setLabel('Shuffle')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(queue.tracks.length < 2),
        new ButtonBuilder()
            .setCustomId('q_clear')
            .setEmoji('🗑️')
            .setLabel('Clear Queue')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(queue.tracks.length === 0),
        new ButtonBuilder()
            .setCustomId('q_next')
            .setEmoji('▶️')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages)
    );
    rows.push(buttonRow);

    // Row 2: Remove Track Select Menu (if tracks exist on current page)
    const tracksPerPage = 10;
    const start = (currentPage - 1) * tracksPerPage;
    const pageTracks = queue.tracks.slice(start, start + tracksPerPage);

    if (pageTracks.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('q_remove_select')
            .setPlaceholder('❌ Select a track to remove from queue…')
            .addOptions(
                pageTracks.map((track, i) => ({
                    label: `${start + i + 1}. ${track.info.title.substring(0, 80)}`,
                    description: track.info.author.substring(0, 80),
                    value: (start + i).toString(),
                }))
            );
        rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
    }

    return rows;
};

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display and interactively manage the music queue')
        .addIntegerOption(option => 
            option.setName('page')
                .setDescription('The page number to view')
                .setMinValue(1)
        ),
    aliases: ['q'],
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const client = interaction.client as ZorinClient;
        const queue = client.queues.get(interaction.guild!.id);
        
        if (!queue || (!queue.current && queue.tracks.length === 0)) {
            await interaction.editReply({ embeds: [createErrorEmbed('The queue is empty!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
            return;
        }

        let page = interaction.options.getInteger('page') || 1;
        let totalPages = Math.ceil(queue.tracks.length / 10) || 1;
        if (page > totalPages) page = totalPages;

        await interaction.editReply({ 
            embeds: [createQueueEmbed(queue, page)], 
            components: buildQueueComponents(queue, page, totalPages),
        });

        const response = await interaction.fetchReply();
        const collector = response.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: 'You are not controlling this menu.', ephemeral: true });
                return;
            }

            await i.deferUpdate();

            if (i.customId === 'q_prev') {
                page = Math.max(1, page - 1);
            } else if (i.customId === 'q_next') {
                page = Math.min(totalPages, page + 1);
            } else if (i.customId === 'q_shuffle') {
                queue.shuffle();
            } else if (i.customId === 'q_clear') {
                queue.clear();
                page = 1;
            } else if (i.customId === 'q_remove_select' && i.isStringSelectMenu()) {
                const removeIdx = parseInt(i.values[0]);
                queue.removeTrack(removeIdx);
            }

            totalPages = Math.ceil(queue.tracks.length / 10) || 1;
            if (page > totalPages) page = totalPages;

            await interaction.editReply({
                embeds: [createQueueEmbed(queue, page)],
                components: buildQueueComponents(queue, page, totalPages)
            }).catch(() => {});
        });

        collector.on('end', () => {
            interaction.deleteReply().catch(() => {});
        });
    },
    async executePrefix(message: Message, args: string[]) {
        const client = message.client as ZorinClient;
        const queue = client.queues.get(message.guild!.id);
        
        if (!queue || (!queue.current && queue.tracks.length === 0)) {
            const err = await message.reply({ embeds: [createErrorEmbed('The queue is empty!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        let page = parseInt(args[0]) || 1;
        let totalPages = Math.ceil(queue.tracks.length / 10) || 1;
        if (page > totalPages) page = totalPages;

        const response = await message.reply({
            embeds: [createQueueEmbed(queue, page)],
            components: buildQueueComponents(queue, page, totalPages)
        });

        const collector = response.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                await i.reply({ content: 'You are not controlling this menu.', ephemeral: true });
                return;
            }

            await i.deferUpdate();

            if (i.customId === 'q_prev') {
                page = Math.max(1, page - 1);
            } else if (i.customId === 'q_next') {
                page = Math.min(totalPages, page + 1);
            } else if (i.customId === 'q_shuffle') {
                queue.shuffle();
            } else if (i.customId === 'q_clear') {
                queue.clear();
                page = 1;
            } else if (i.customId === 'q_remove_select' && i.isStringSelectMenu()) {
                const removeIdx = parseInt(i.values[0]);
                queue.removeTrack(removeIdx);
            }

            totalPages = Math.ceil(queue.tracks.length / 10) || 1;
            if (page > totalPages) page = totalPages;

            await response.edit({
                embeds: [createQueueEmbed(queue, page)],
                components: buildQueueComponents(queue, page, totalPages)
            }).catch(() => {});
        });

        collector.on('end', () => {
            response.delete().catch(() => {});
            message.delete().catch(() => {});
        });
    },
};

export default command;
