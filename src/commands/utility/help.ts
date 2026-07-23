import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    Message, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createEmbed, Colors } from '../../utils/embeds';

const buildHelpEmbed = (client: ZorinClient) => {
    const embed = createEmbed({
        color: Colors.Primary,
        author: { name: '📖  Zorin Music — Commands' },
        description: [
            '**🎵 Music Commands**',
            '`/play` — Play a track or playlist',
            '`/search` — Search for a track',
            '`/pause` — Pause the player',
            '`/resume` — Resume the player',
            '`/skip` — Skip to the next track',
            '`/previous` — Play the previous track',
            '`/stop` — Stop the player',
            '`/leave` — Leave the voice channel',
            '`/nowplaying` — Show the currently playing track',
            '`/queue` — Display the queue',
            '`/remove` — Remove a track from the queue',
            '`/loop` — Cycle or set loop mode',
            '`/shuffle` — Shuffle the queue',
            '`/volume` — Set the volume',
            '`/filter` — Apply an audio filter',
            '`/fix` — Repair voice connection/player',
            '',
            '**⚙️ Utility Commands**',
            '`/help` — Show this help menu',
            '',
            '> All commands also work with the `!` prefix.',
        ].join('\n'),
        footer: 'Zorin Music  •  Press Delete Menu below to dismiss',
    });
    
    return embed;
};

const getDeleteRow = () => {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('help-delete')
            .setLabel('Delete Menu')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)
    );
};

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List all commands'),
    aliases: ['h', 'commands'],
    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as ZorinClient;
        const response = await interaction.reply({ 
            embeds: [buildHelpEmbed(client)], 
            components: [getDeleteRow()],
            fetchReply: true 
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.customId === 'help-delete',
        });

        collector.on('collect', async i => {
            await i.deferUpdate().catch(() => {});
            interaction.deleteReply().catch(() => {});
            collector.stop();
        });
    },
    async executePrefix(message: Message, args: string[]) {
        const client = message.client as ZorinClient;
        const reply = await message.reply({ 
            embeds: [buildHelpEmbed(client)],
            components: [getDeleteRow()],
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.customId === 'help-delete',
        });

        collector.on('collect', async i => {
            await i.deferUpdate().catch(() => {});
            reply.delete().catch(() => {});
            collector.stop();
        });
    },
};

export default command;
