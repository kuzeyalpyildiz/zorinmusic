import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand, QueueTrack } from '../../types';
import { createErrorEmbed, createEmbed, Colors, createTrackAddedEmbed } from '../../utils/embeds';
import { smartResolve } from '../../utils/resolver';

const SOURCE_PREFIX_MAP: Record<string, string> = {
    ytm: 'ytmsearch',
    ytmsearch: 'ytmsearch',
    youtubemusic: 'ytmsearch',
    sp: 'spsearch',
    spsearch: 'spsearch',
    spotify: 'spsearch',
    yt: 'ytsearch',
    ytsearch: 'ytsearch',
    youtube: 'ytsearch',
    sc: 'scsearch',
    scsearch: 'scsearch',
    soundcloud: 'scsearch',
    dz: 'dzsearch',
    dzsearch: 'dzsearch',
    deezer: 'dzsearch',
    am: 'amsearch',
    amsearch: 'amsearch',
    applemusic: 'amsearch',
};

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for a track across platforms and select from top 5 results')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The track to search for')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('source')
                .setDescription('Optional audio platform source to search from')
                .setRequired(false)
                .addChoices(
                    { name: '🎵 YouTube Music', value: 'ytmsearch' },
                    { name: '💚 Spotify', value: 'spsearch' },
                    { name: '▶️ YouTube', value: 'ytsearch' },
                    { name: '🟠 SoundCloud', value: 'scsearch' },
                    { name: '📦 Deezer', value: 'dzsearch' },
                    { name: '🍎 Apple Music', value: 'amsearch' }
                )
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
        const source = interaction.options.getString('source');
        let node: any;
        try {
            node = client.getNode();
        } catch {
            await interaction.editReply({ embeds: [createErrorEmbed('Lavalink audio server is currently reconnecting or offline. Please try again in a few seconds!')] });
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
            return;
        }

        let result: any;

        if (source) {
            // Direct explicit source search
            result = await node.rest.resolve(`${source}:${query}`).catch(() => null);
        } else {
            // Smart multi-platform auto-search fallback
            result = await smartResolve(node, query);
        }

        if (!result || !result.data) {
            await interaction.editReply({ embeds: [createErrorEmbed('No results found for your search.')] });
            return;
        }

        const rawData = Array.isArray(result.data) ? result.data : [result.data];
        if (rawData.length === 0) {
            await interaction.editReply({ embeds: [createErrorEmbed('No results found.')] });
            return;
        }

        const tracks = rawData.slice(0, 5);
        const description = tracks.map((t: any, i: number) => `**${i + 1}.** ${t.info.title} — ${t.info.author}`).join('\n');

        const embed = createEmbed({
            color: Colors.Info,
            title: `🔍  Search Results for "${query}"`,
            description,
            footer: `Zorin Music  •  Source: ${source ? source.replace('search', '') : 'Auto Multi-Platform'}`,
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

        // Check if first arg specifies a source (e.g., !search spotify query OR !search -sp query)
        let sourcePrefix: string | null = null;
        let rawQuery = args.join(' ');
        const firstArgKey = args[0].toLowerCase().replace(/^[-/]/, '');

        if (SOURCE_PREFIX_MAP[firstArgKey]) {
            sourcePrefix = SOURCE_PREFIX_MAP[firstArgKey];
            rawQuery = args.slice(1).join(' ');
        }

        let node: any;
        try {
            node = client.getNode();
        } catch {
            const err = await message.reply({ embeds: [createErrorEmbed('Lavalink audio server is currently reconnecting or offline. Please try again in a few seconds!')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }
        let result: any;

        if (sourcePrefix) {
            result = await node.rest.resolve(`${sourcePrefix}:${rawQuery}`).catch(() => null);
        } else {
            result = await smartResolve(node, rawQuery);
        }

        if (!result || !result.data) {
            const err = await message.reply({ embeds: [createErrorEmbed('No results found for your search.')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const rawData = Array.isArray(result.data) ? result.data : [result.data];
        if (rawData.length === 0) {
            const err = await message.reply({ embeds: [createErrorEmbed('No results found.')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const tracks = rawData.slice(0, 5);
        const description = tracks.map((t: any, i: number) => `**${i + 1}.** ${t.info.title} — ${t.info.author}`).join('\n');

        const embed = createEmbed({
            color: Colors.Info,
            title: `🔍  Search Results for "${rawQuery}"`,
            description,
            footer: `Zorin Music  •  Source: ${sourcePrefix ? sourcePrefix.replace('search', '') : 'Auto Multi-Platform'}`,
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
