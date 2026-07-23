import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    Message, 
    GuildMember, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ComponentType, 
    VoiceChannel 
} from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand } from '../../types';
import { createErrorEmbed, createSuccessEmbed, createEmbed, Colors } from '../../utils/embeds';

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('fix')
        .setDescription('Open the player repair menu to reconnect, recreate player, or change voice region'),
    aliases: ['repair', 'reconnect'],
    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as ZorinClient;
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel as VoiceChannel | null;

        if (!voiceChannel) {
            await interaction.reply({ embeds: [createErrorEmbed('You need to be in a voice channel!')], ephemeral: true });
            return;
        }

        const embed = createEmbed({
            color: Colors.Warning,
            title: '🛠️  Zorin Music — Repair Menu',
            description: 'Select an option below to troubleshoot your connection or player state:',
            footer: 'Zorin Music  •  Auto-deletes in 30 seconds',
        });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('fix-menu')
                .setPlaceholder('Choose a repair action…')
                .addOptions([
                    {
                        label: 'Reconnect Bot',
                        description: 'Re-establishes the voice channel connection',
                        value: 'reconnect',
                        emoji: '🔄',
                    },
                    {
                        label: 'Recreate Player',
                        description: 'Re-initializes player state without disconnecting from voice',
                        value: 'recreate',
                        emoji: '🛠️',
                    },
                    {
                        label: 'Change Voice Region',
                        description: 'Rotates or optimizes the voice channel RTC region',
                        value: 'region',
                        emoji: '🌐',
                    },
                ])
        );

        const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = interaction.channel?.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id && i.customId === 'fix-menu',
            time: 30000,
        });

        if (!collector) return;

        collector.on('collect', async i => {
            await i.deferUpdate();
            const choice = i.values[0];

            let responseMsg = '';

            if (choice === 'reconnect') {
                const queue = client.queues.get(interaction.guildId!);
                const currentTrack = queue?.current;
                const position = queue?.player.position ?? 0;

                await client.shoukaku.leaveVoiceChannel(interaction.guildId!);
                const newPlayer = await client.shoukaku.joinVoiceChannel({
                    guildId: interaction.guildId!,
                    channelId: voiceChannel.id,
                    shardId: interaction.guild!.shardId,
                    deaf: true,
                });

                if (queue) {
                    queue.player = newPlayer;
                    if (currentTrack) {
                        await newPlayer.playTrack({ track: { encoded: currentTrack.encoded }, position });
                    }
                }
                responseMsg = '🔄 Reconnected bot voice connection!';
            } else if (choice === 'recreate') {
                const queue = client.queues.get(interaction.guildId!);
                if (queue && queue.current) {
                    const pos = queue.player.position;
                    await queue.player.playTrack({ track: { encoded: queue.current.encoded }, position: pos });
                    responseMsg = '🛠️ Recreated player state and resumed playback!';
                } else {
                    responseMsg = '🛠️ Recreated player state!';
                }
            } else if (choice === 'region') {
                const currentRegion = voiceChannel.rtcRegion;
                const regions = ['us-east', 'us-west', 'europe', 'singapore', 'sydney', 'brazil', null];
                const nextRegion = regions[(regions.indexOf(currentRegion) + 1) % regions.length];
                await voiceChannel.setRTCRegion(nextRegion).catch(() => {});
                responseMsg = `🌐 Voice channel region updated to **${nextRegion ?? 'Automatic'}**!`;
            }

            const successEmbed = createSuccessEmbed(responseMsg);
            const statusMsg = await interaction.followUp({ embeds: [successEmbed] });
            setTimeout(() => statusMsg.delete().catch(() => {}), 5000);
            interaction.deleteReply().catch(() => {});
            collector.stop('selected');
        });

        collector.on('end', (_collected, reason) => {
            if (reason !== 'selected') {
                interaction.deleteReply().catch(() => {});
            }
        });
    },
    async executePrefix(message: Message, args: string[]) {
        const client = message.client as ZorinClient;
        const member = message.member!;
        const voiceChannel = member.voice.channel as VoiceChannel | null;

        if (!voiceChannel) {
            const err = await message.reply({ embeds: [createErrorEmbed('You need to be in a voice channel!')] });
            setTimeout(() => err.delete().catch(() => {}), 5000);
            return;
        }

        const embed = createEmbed({
            color: Colors.Warning,
            title: '🛠️  Zorin Music — Repair Menu',
            description: 'Select an option below to troubleshoot your connection or player state:',
            footer: 'Zorin Music  •  Auto-deletes in 30 seconds',
        });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('fix-menu-prefix')
                .setPlaceholder('Choose a repair action…')
                .addOptions([
                    {
                        label: 'Reconnect Bot',
                        description: 'Re-establishes the voice channel connection',
                        value: 'reconnect',
                        emoji: '🔄',
                    },
                    {
                        label: 'Recreate Player',
                        description: 'Re-initializes player state without disconnecting from voice',
                        value: 'recreate',
                        emoji: '🛠️',
                    },
                    {
                        label: 'Change Voice Region',
                        description: 'Rotates or optimizes the voice channel RTC region',
                        value: 'region',
                        emoji: '🌐',
                    },
                ])
        );

        const replyMsg = await message.reply({ embeds: [embed], components: [row] });

        const collector = message.channel.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === message.author.id && i.customId === 'fix-menu-prefix',
            time: 30000,
        });

        collector.on('collect', async i => {
            await i.deferUpdate();
            const choice = i.values[0];

            let responseMsg = '';

            if (choice === 'reconnect') {
                const queue = client.queues.get(message.guildId!);
                const currentTrack = queue?.current;
                const position = queue?.player.position ?? 0;

                await client.shoukaku.leaveVoiceChannel(message.guildId!);
                const newPlayer = await client.shoukaku.joinVoiceChannel({
                    guildId: message.guildId!,
                    channelId: voiceChannel.id,
                    shardId: message.guild!.shardId,
                    deaf: true,
                });

                if (queue) {
                    queue.player = newPlayer;
                    if (currentTrack) {
                        await newPlayer.playTrack({ track: { encoded: currentTrack.encoded }, position });
                    }
                }
                responseMsg = '🔄 Reconnected bot voice connection!';
            } else if (choice === 'recreate') {
                const queue = client.queues.get(message.guildId!);
                if (queue && queue.current) {
                    const pos = queue.player.position;
                    await queue.player.playTrack({ track: { encoded: queue.current.encoded }, position: pos });
                    responseMsg = '🛠️ Recreated player state and resumed playback!';
                } else {
                    responseMsg = '🛠️ Recreated player state!';
                }
            } else if (choice === 'region') {
                const currentRegion = voiceChannel.rtcRegion;
                const regions = ['us-east', 'us-west', 'europe', 'singapore', 'sydney', 'brazil', null];
                const nextRegion = regions[(regions.indexOf(currentRegion) + 1) % regions.length];
                await voiceChannel.setRTCRegion(nextRegion).catch(() => {});
                responseMsg = `🌐 Voice channel region updated to **${nextRegion ?? 'Automatic'}**!`;
            }

            if (message.channel.isSendable()) {
                const statusMsg = await message.channel.send({ embeds: [createSuccessEmbed(responseMsg)] });
                setTimeout(() => statusMsg.delete().catch(() => {}), 5000);
            }
            replyMsg.delete().catch(() => {});
            message.delete().catch(() => {});
            collector.stop('selected');
        });

        collector.on('end', (_collected, reason) => {
            if (reason !== 'selected') {
                replyMsg.delete().catch(() => {});
                message.delete().catch(() => {});
            }
        });
    },
};

export default command;
