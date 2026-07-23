import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand, QueueTrack } from '../../types';
import { createErrorEmbed, createEmbed, Colors, createTrackAddedEmbed } from '../../utils/embeds';
import { smartResolve } from '../../utils/resolver';

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for a track across platforms and select from top 5 results')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The track to search for')
                .setRequired(true)
        ),
    aliases: ['sr'],
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const client = interaction.client as ZorinClient;
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            await interaction.editReply({ embeds: [createErrorEmbed('You need to be in a voice channel!')] });
            return;
        }

        const query = interaction.options.getString('query', true);
        const node = client.getNode();
        const result = await smartResolve(node, query);

        if (!result || !result.data) {
            await interaction.editReply({ embeds: [createErrorEmbed('No results found across platforms.')] });
            return;
        }

        const rawData = Array.isArray(result.data) ? result.data : [result.data];
        const tracks = rawData.slice(0, 5);
        const description = tracks.map((t: any, i: number) => `**${i + 1}.** ${t.info.title} — ${t.info.author}`).join('\n');

        const embed = createEmbed({
            color: Colors.Info,
            title: `🔍  Search Results for "${query}"`,
            description,
            footer: 'Zorin Music  •  Select a track from the menu below within 30 seconds',
        });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('search-select')
                .setPlaceholder('Select a track to play')
                .addOptions(tracks.map((t: any, i: number) => ({ 
                    label: t.info.title.substring(0, 100), 
                    description: t.info.author.substring(0, 100),
                    value: i.toString() 
                })))
        );

        await interaction.editReply({ embeds: [embed], components: [row] });

        const collector = interaction.channel?.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id && i.customId === 'search-select',
            time: 30000
        });

        if (!collector) return;

        collector.on('collect', async i => {
            await i.deferUpdate();
            const selectedIndex = parseInt(i.values[0]);
            const trackData = tracks[selectedIndex];

            let queue = client.queues.get(interaction.guildId!);
            if (!queue) {
                queue = await client.createPlayer(interaction.guildId!, voiceChannel.id, interaction.guild!.shardId, interaction.channelId);
            }

            const track: QueueTrack = {
                ...(trackData as any),
                requester: {
                    id: interaction.user.id,
                    username: interaction.user.username,
                    displayName: interaction.user.displayName,
                    avatarURL: interaction.user.displayAvatarURL()
                }
            };

            queue.addTrack(track);
            await interaction.editReply({ embeds: [createTrackAddedEmbed(track, queue.size)], components: [] });

            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);

            if (!queue.current) {
                const next = queue.nextTrack();
                if (next) {
                    await queue.player.playTrack({ track: { encoded: next.encoded } });
                }
            }
            collector.stop('selected');
        });

        collector.on('end', (_collected, reason) => {
            if (reason !== 'selected') {
                interaction.deleteReply().catch(() => {});
            }
        });
    },
    async executePrefix(message: Message, args: string[]) {
        if (!args.length) {
            const err = await message.reply({ embeds: [createErrorEmbed('Please provide a query!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const client = message.client as ZorinClient;
        const member = message.member!;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            const err = await message.reply({ embeds: [createErrorEmbed('You need to be in a voice channel!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const query = args.join(' ');
        const node = client.getNode();
        const result = await smartResolve(node, query);

        if (!result || !result.data) {
            const err = await message.reply({ embeds: [createErrorEmbed('No results found across platforms.')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const rawData = Array.isArray(result.data) ? result.data : [result.data];
        const tracks = rawData.slice(0, 5);
        const description = tracks.map((t: any, i: number) => `**${i + 1}.** ${t.info.title} — ${t.info.author}`).join('\n');

        const embed = createEmbed({
            color: Colors.Info,
            title: `🔍  Search Results for "${query}"`,
            description,
            footer: 'Zorin Music  •  Select a track from the menu below within 30 seconds',
        });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('search-select-prefix')
                .setPlaceholder('Select a track to play')
                .addOptions(tracks.map((t: any, i: number) => ({ 
                    label: t.info.title.substring(0, 100), 
                    description: t.info.author.substring(0, 100),
                    value: i.toString() 
                })))
        );

        const replyMessage = await message.reply({ embeds: [embed], components: [row] });

        const collector = message.channel.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === message.author.id && i.customId === 'search-select-prefix',
            time: 30000
        });

        collector.on('collect', async i => {
            await i.deferUpdate();
            const selectedIndex = parseInt(i.values[0]);
            const trackData = tracks[selectedIndex];

            let queue = client.queues.get(message.guildId!);
            if (!queue) {
                queue = await client.createPlayer(message.guildId!, voiceChannel.id, message.guild!.shardId, message.channelId);
            }

            const track: QueueTrack = {
                ...(trackData as any),
                requester: {
                    id: message.author.id,
                    username: message.author.username,
                    displayName: message.author.displayName,
                    avatarURL: message.author.displayAvatarURL()
                }
            };

            queue.addTrack(track);
            await replyMessage.edit({ embeds: [createTrackAddedEmbed(track, queue.size)], components: [] });

            setTimeout(() => {
                replyMessage.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);

            if (!queue.current) {
                const next = queue.nextTrack();
                if (next) {
                    await queue.player.playTrack({ track: { encoded: next.encoded } });
                }
            }
            collector.stop('selected');
        });

        collector.on('end', (_collected, reason) => {
            if (reason !== 'selected') {
                replyMessage.delete().catch(() => {});
                message.delete().catch(() => {});
            }
        });
    }
};

export default command;
