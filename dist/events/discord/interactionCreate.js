"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const embeds_1 = require("../../utils/embeds");
exports.default = {
    name: 'interactionCreate',
    once: false,
    async execute(client, interaction) {
        if (!interaction.isChatInputCommand())
            return;
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            await interaction.reply({
                embeds: [(0, embeds_1.createErrorEmbed)('Unknown command.')],
                ephemeral: true,
            });
            return;
        }
        try {
            await command.execute(interaction);
        }
        catch (error) {
            console.error(`[Command Error] /${interaction.commandName}:`, error);
            const content = { embeds: [(0, embeds_1.createErrorEmbed)('An unexpected error occurred while running this command.')] };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ ...content, ephemeral: true }).catch(() => { });
            }
            else {
                await interaction.reply({ ...content, ephemeral: true }).catch(() => { });
            }
        }
    },
};
