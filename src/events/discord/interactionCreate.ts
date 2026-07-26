import { Interaction } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { createErrorEmbed } from '../../utils/embeds';

export default {
    name: 'interactionCreate',
    once: false,
    async execute(client: ZorinClient, interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) {
            await interaction.reply({
                embeds: [createErrorEmbed('Unknown command.')],
                ephemeral: true,
            });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`[Command Error] /${interaction.commandName}:`, error);
            const content = { embeds: [createErrorEmbed('An unexpected error occurred while running this command.')] };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ ...content, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ ...content, ephemeral: true }).catch(() => {});
            }
        }
    },
};
