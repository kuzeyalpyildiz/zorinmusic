"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const embeds_1 = require("../../utils/embeds");
exports.default = {
    name: 'interactionCreate',
    once: false,
    async execute(client, interaction) {
        // Handle Slash Commands
        if (interaction.isChatInputCommand()) {
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
            return;
        }
        // Handle Interactive Embed Button Controls
        if (interaction.isButton()) {
            const customId = interaction.customId;
            if (!customId.startsWith('btn_'))
                return;
            const member = interaction.member;
            const voiceChannel = member?.voice?.channel;
            const guildId = interaction.guildId;
            if (!voiceChannel) {
                await interaction.reply({
                    embeds: [(0, embeds_1.createErrorEmbed)('You must be in a voice channel to use music controls!')],
                    ephemeral: true,
                });
                return;
            }
            const queue = client.queues.get(guildId);
            if (!queue || !queue.current) {
                await interaction.reply({
                    embeds: [(0, embeds_1.createErrorEmbed)('Nothing is currently playing!')],
                    ephemeral: true,
                });
                return;
            }
            if (!voiceChannel.members.has(client.user.id)) {
                await interaction.reply({
                    embeds: [(0, embeds_1.createErrorEmbed)('You must be in the same voice channel as Zorin Music!')],
                    ephemeral: true,
                });
                return;
            }
            await interaction.deferUpdate().catch(() => { });
            try {
                switch (customId) {
                    case 'btn_pause_toggle': {
                        const newPaused = !queue.paused;
                        queue.paused = newPaused;
                        await queue.player.setPaused(newPaused);
                        break;
                    }
                    case 'btn_skip': {
                        await queue.player.stopTrack();
                        break;
                    }
                    case 'btn_prev': {
                        const prev = queue.previous || (queue.history.length > 0 ? queue.history[queue.history.length - 1] : null);
                        if (!prev) {
                            await interaction.followUp({
                                embeds: [(0, embeds_1.createErrorEmbed)('No previous track found in history!')],
                                ephemeral: true,
                            }).catch(() => { });
                            return;
                        }
                        if (queue.current) {
                            queue.tracks.unshift(queue.current);
                        }
                        queue.current = prev;
                        await queue.player.playTrack({ track: { encoded: prev.encoded } });
                        break;
                    }
                    case 'btn_loop_toggle': {
                        if (queue.loop === 'off')
                            queue.loop = 'track';
                        else if (queue.loop === 'track')
                            queue.loop = 'queue';
                        else
                            queue.loop = 'off';
                        break;
                    }
                    case 'btn_stop': {
                        client.destroyPlayer(guildId);
                        break;
                    }
                }
                // Update the Now Playing message embed & button states
                if (queue.current && queue.lastNowPlayingMessage) {
                    const updatedEmbed = (0, embeds_1.createNowPlayingEmbed)(queue.current, queue.player.position);
                    const updatedComponents = (0, embeds_1.createNowPlayingComponents)(queue);
                    await queue.lastNowPlayingMessage.edit({
                        embeds: [updatedEmbed],
                        components: updatedComponents,
                    }).catch(() => { });
                }
            }
            catch (err) {
                console.error('[Button Control Error]:', err);
            }
        }
    },
};
