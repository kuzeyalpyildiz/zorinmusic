"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../config");
const embeds_1 = require("../../utils/embeds");
exports.default = {
    name: 'messageCreate',
    once: false,
    async execute(client, message) {
        if (message.author.bot)
            return;
        if (!message.content.startsWith(config_1.config.prefix))
            return;
        if (!message.guild)
            return;
        const args = message.content.slice(config_1.config.prefix.length).trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName)
            return;
        // Resolve command by name or alias
        const resolvedName = client.aliases.get(commandName) ?? commandName;
        const command = client.commands.get(resolvedName);
        if (!command)
            return; // Silently ignore unknown prefix commands
        if (!command.executePrefix) {
            await message.reply({
                embeds: [(0, embeds_1.createErrorEmbed)('This command is only available as a slash command.')],
            });
            return;
        }
        try {
            await command.executePrefix(message, args);
        }
        catch (error) {
            console.error(`[Prefix Error] ${config_1.config.prefix}${commandName}:`, error);
            await message.reply({
                embeds: [(0, embeds_1.createErrorEmbed)('An unexpected error occurred while running this command.')],
            }).catch(() => { });
        }
    },
};
