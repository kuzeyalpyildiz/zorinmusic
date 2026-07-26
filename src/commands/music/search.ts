import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand, QueueTrack } from '../../types';
import { createErrorEmbed, createEmbed, Colors, createTrackAddedEmbed } from '../../utils/embeds';
import { smartResolve, searchAllPlatforms, PLATFORM_LABELS } from '../../utils/resolver';

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
        let tracks: any[] = [];
        let searchSource = 'Auto Multi-Platform';

        if (source) {
            // Direct explicit source search
            result = await node.rest.resolve(`${source}:${query}`).catch(() => null);
            searchSource = PLATFORM_LABELS[`${source}:`] ?? source.replace('search', '');

            if (!result || !result.data) {
                await interaction.editReply({ embeds: [createErrorEmbed('No results found for your search.')] });
                return;
            }

            const rawData = Array.isArray(result.data) ? result.data : [result.data];
            if (rawData.length === 0) {
                await interaction.editReply({ embeds: [createErrorEmbed('No results found.')] });
                return;
            }
            tracks = rawData.slice(0, 5);
        } else {
            // Parallel multi-platform search — get results from ALL platforms
            const allResults = await searchAllPlatforms(node, query);
            const platformKeys = Object.keys(allResults);

            if (platformKeys.length === 0) {
                await interaction.editReply({ embeds: [createErrorEmbed('No results found across any platform.')] });
                return;
            }

            // Aggregate top result from each platform, up to 5 total
            for (const prefix of platformKeys) {
                const res = allResults[prefix];
                const data = Array.isArray(res.data) ? res.data : [res.data];
                for (const t of data.slice(0, Math.max(1, Math.floor(5 / platformKeys.length)))) {
                    if (tracks.length >= 5) break;
                    tracks.push({ ...t, _sourcePlatform: prefix });
                }
                if (tracks.length >= 5) break;
            }

            // If we still have room, fill from the first platform with most results
            if (tracks.length < 5) {
                for (const prefix of platformKeys) {
                    const res = allResults[prefix];
                    const data = Array.isArray(res.data) ? res.data : [res.data];
                    for (const t of data) {
                        const isDuplicate = tracks.some(existing => existing.info.title === t.info.title && existing.info.author === t.info.author);
                        if (!isDuplicate && tracks.length < 5) {
                            tracks.push({ ...t, _sourcePlatform: prefix });
                        }
                    }
                }
            }

            searchSource = `${platformKeys.length} platform${platformKeys.length > 1 ? 's' : ''} searched`;
        }

        if (tracks.length === 0) {
            await interaction.editReply({ embeds: [createErrorEmbed('No results found.')] });
            return;
        }

        const description = tracks.map((t: any, i: number) => {
            const platformTag = t._sourcePlatform ? ` [${PLATFORM_LABELS[t._sourcePlatform] ?? t._sourcePlatform}]` : '';
            return `**${i + 1}.** ${t.info.title} — ${t.info.author}${platformTag}`;
        }).join('\n');

        const embed = createEmbed({
            color: Colors.Info,
            title: `🔍  Search Results for "${query}"`,
            description,
            footer: `Zorin Music  •  ${searchSource}`,
        });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('search-select')
                .setPlaceholder('Select a track to play')
                .addOptions(tracks.map((t: any, i: number) => ({ 
                    label: t.info.title.substring(0, 100), 
                    description: `${t.info.author.substring(0, 50)} • ${PLATFORM_LABELS[t._sourcePlatform] ?? t.info.sourceName ?? 'Unknown'}`.substring(0, 100),
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
        let tracks: any[] = [];
        let prefixSearchSource = 'Auto Multi-Platform';

        if (sourcePrefix) {
            result = await node.rest.resolve(`${sourcePrefix}:${rawQuery}`).catch(() => null);
            prefixSearchSource = PLATFORM_LABELS[`${sourcePrefix}:`] ?? sourcePrefix.replace('search', '');

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
            tracks = rawData.slice(0, 5);
        } else {
            // Parallel multi-platform search
            const allResults = await searchAllPlatforms(node, rawQuery);
            const platformKeys = Object.keys(allResults);

            if (platformKeys.length === 0) {
                const err = await message.reply({ embeds: [createErrorEmbed('No results found across any platform.')] });
                setTimeout(() => {
                    err.delete().catch(() => {});
                    message.delete().catch(() => {});
                }, 5000);
                return;
            }

            // Aggregate top result from each platform, up to 5 total
            for (const prefix of platformKeys) {
                const res = allResults[prefix];
                const data = Array.isArray(res.data) ? res.data : [res.data];
                for (const t of data.slice(0, Math.max(1, Math.floor(5 / platformKeys.length)))) {
                    if (tracks.length >= 5) break;
                    tracks.push({ ...t, _sourcePlatform: prefix });
                }
                if (tracks.length >= 5) break;
            }

            if (tracks.length < 5) {
                for (const prefix of platformKeys) {
                    const res = allResults[prefix];
                    const data = Array.isArray(res.data) ? res.data : [res.data];
                    for (const t of data) {
                        const isDuplicate = tracks.some(existing => existing.info.title === t.info.title && existing.info.author === t.info.author);
                        if (!isDuplicate && tracks.length < 5) {
                            tracks.push({ ...t, _sourcePlatform: prefix });
                        }
                    }
                }
            }

            prefixSearchSource = `${platformKeys.length} platform${platformKeys.length > 1 ? 's' : ''} searched`;
        }

        if (tracks.length === 0) {
            const err = await message.reply({ embeds: [createErrorEmbed('No results found.')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        const description = tracks.map((t: any, i: number) => {
            const platformTag = t._sourcePlatform ? ` [${PLATFORM_LABELS[t._sourcePlatform] ?? t._sourcePlatform}]` : '';
            return `**${i + 1}.** ${t.info.title} — ${t.info.author}${platformTag}`;
        }).join('\n');

        const embed = createEmbed({
            color: Colors.Info,
            title: `🔍  Search Results for "${rawQuery}"`,
            description,
            footer: `Zorin Music  •  ${prefixSearchSource}`,
        });

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('search-select-prefix')
                .setPlaceholder('Select a track to play')
                .addOptions(tracks.map((t: any, i: number) => ({ 
                    label: t.info.title.substring(0, 100), 
                    description: `${t.info.author.substring(0, 50)} • ${PLATFORM_LABELS[t._sourcePlatform] ?? t.info.sourceName ?? 'Unknown'}`.substring(0, 100),
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
