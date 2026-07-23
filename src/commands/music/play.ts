import { SlashCommandBuilder, ChatInputCommandInteraction, Message, GuildMember } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { ZorinCommand, QueueTrack } from '../../types';
import { createErrorEmbed, createTrackAddedEmbed, createPlaylistAddedEmbed } from '../../utils/embeds';
import { smartResolve } from '../../utils/resolver';

const command: ZorinCommand = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Searches and plays a track or playlist across YouTube Music, Spotify, YouTube & SoundCloud')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The track or playlist to search for (URL or search keywords)')
                .setRequired(true)
        ),
    aliases: ['p'],
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

        if (!result) {
            await interaction.editReply({ embeds: [createErrorEmbed('No results found across platforms.')] });
            return;
        }

        let queue = client.queues.get(interaction.guildId!);
        if (!queue) {
            queue = await client.createPlayer(interaction.guildId!, voiceChannel.id, interaction.guild!.shardId, interaction.channelId);
        }

        const requester = {
            id: interaction.user.id,
            username: interaction.user.username,
            displayName: interaction.user.displayName,
            avatarURL: interaction.user.displayAvatarURL()
        };

        if (result.loadType === 'playlist') {
            const tracks: QueueTrack[] = result.data.tracks.map((t: any) => ({ ...t, requester }));
            queue.addTracks(tracks);
            const playlistDuration = tracks.reduce((acc: number, t: QueueTrack) => acc + t.info.length, 0);
            await interaction.editReply({ embeds: [createPlaylistAddedEmbed(result.data.info.name, tracks.length, playlistDuration, requester)] });
        } else {
            const trackData = result.loadType === 'search' ? (result.data as any[])[0] : result.data;
            const track: QueueTrack = { ...(trackData as any), requester };
            queue.addTrack(track);
            await interaction.editReply({ embeds: [createTrackAddedEmbed(track, queue.size)] });
        }

        setTimeout(() => {
            interaction.deleteReply().catch(() => {});
        }, 5000);

        if (!queue.current) {
            const next = queue.nextTrack();
            if (next) {
                await queue.player.playTrack({ track: { encoded: next.encoded } });
            }
        }
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

        if (!result) {
            const err = await message.reply({ embeds: [createErrorEmbed('No results found across platforms.')] });
            setTimeout(() => {
                err.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
            return;
        }

        let queue = client.queues.get(message.guildId!);
        if (!queue) {
            queue = await client.createPlayer(message.guildId!, voiceChannel.id, message.guild!.shardId, message.channelId);
        }

        const requester = {
            id: message.author.id,
            username: message.author.username,
            displayName: message.author.displayName,
            avatarURL: message.author.displayAvatarURL()
        };

        let responseMessage: Message;
        if (result.loadType === 'playlist') {
            const tracks: QueueTrack[] = result.data.tracks.map((t: any) => ({ ...t, requester }));
            queue.addTracks(tracks);
            const playlistDuration = tracks.reduce((acc: number, t: QueueTrack) => acc + t.info.length, 0);
            responseMessage = await message.reply({ embeds: [createPlaylistAddedEmbed(result.data.info.name, tracks.length, playlistDuration, requester)] });
        } else {
            const trackData = result.loadType === 'search' ? (result.data as any[])[0] : result.data;
            const track: QueueTrack = { ...(trackData as any), requester };
            queue.addTrack(track);
            responseMessage = await message.reply({ embeds: [createTrackAddedEmbed(track, queue.size)] });
        }

        setTimeout(() => {
            responseMessage.delete().catch(() => {});
            message.delete().catch(() => {});
        }, 5000);

        if (!queue.current) {
            const next = queue.nextTrack();
            if (next) {
                await queue.player.playTrack({ track: { encoded: next.encoded } });
            }
        }
    }
};

export default command;
