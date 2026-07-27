import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { QueueTrack } from '../types';
import { MusicQueue } from '../structures/MusicQueue';

// ── Zorin Music colour palette ──
export const Colors = {
    Primary: 0x7C3AED,   // Vivid Purple
    Success: 0x10B981,   // Emerald
    Error: 0xEF4444,     // Red
    Warning: 0xF59E0B,   // Amber
    Music: 0xEC4899,     // Pink
    Info: 0x3B82F6,      // Blue
    Queue: 0x8B5CF6,     // Violet
} as const;

// ── Duration formatter  (ms → "3:42" or "1:02:15") ──
export function formatDuration(ms: number): string {
    if (ms <= 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// ── Visual progress bar ──
export function renderProgressBar(current: number, total: number, size: number = 15): string {
    if (total <= 0) return '▬'.repeat(size);
    const progress = Math.round((current / total) * size);
    const filled = '▬'.repeat(Math.max(0, progress));
    const empty = '▬'.repeat(Math.max(0, size - progress - 1));
    return `${filled}🔘${empty}`;
}

// ── Base embed factory ──
export function createEmbed(options: {
    color?: number;
    title?: string;
    description?: string;
    thumbnail?: string | null;
    footer?: string;
    fields?: { name: string; value: string; inline?: boolean }[];
    author?: { name: string; iconURL?: string; url?: string };
}): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(options.color ?? Colors.Primary)
        .setTimestamp();

    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.footer) embed.setFooter({ text: options.footer });
    if (options.fields) embed.addFields(options.fields);
    if (options.author) embed.setAuthor(options.author);

    return embed;
}

// ── Pre-styled shorthand embeds ──
export function createSuccessEmbed(description: string): EmbedBuilder {
    return createEmbed({
        color: Colors.Success,
        description: `✅  ${description}`,
        footer: 'Zorin Music',
    });
}

export function createErrorEmbed(description: string): EmbedBuilder {
    return createEmbed({
        color: Colors.Error,
        description: `❌  ${description}`,
        footer: 'Zorin Music',
    });
}

export function createWarningEmbed(description: string): EmbedBuilder {
    return createEmbed({
        color: Colors.Warning,
        description: `⚠️  ${description}`,
        footer: 'Zorin Music',
    });
}

export function createInfoEmbed(description: string): EmbedBuilder {
    return createEmbed({
        color: Colors.Info,
        description: `ℹ️  ${description}`,
        footer: 'Zorin Music',
    });
}

// ── Now Playing embed ──
export function createNowPlayingEmbed(track: QueueTrack, position: number = 0): EmbedBuilder {
    if (!track || !track.info) {
        return createEmbed({
            color: Colors.Music,
            title: '🎶  Now Playing',
            description: 'Loading track information…',
            footer: 'Zorin Music',
        });
    }

    const bar = renderProgressBar(position, track.info.length);
    const elapsed = formatDuration(position);
    const total = track.info.isStream ? '🔴 LIVE' : formatDuration(track.info.length);

    return createEmbed({
        color: Colors.Music,
        author: { name: '🎶  Now Playing' },
        title: track.info.title,
        description: [
            '',
            `**Artist** ─ ${track.info.author}`,
            '',
            `${bar}`,
            `\`${elapsed}\` / \`${total}\``,
            '',
            `**Requested by** <@${track.requester.id}>`,
        ].join('\n'),
        thumbnail: track.info.artworkUrl,
        footer: `Zorin Music  •  Source: ${track.info.sourceName}`,
    });
}

// ── Track Added / Enqueued embed ──
export function createTrackAddedEmbed(track: QueueTrack, queuePosition: number): EmbedBuilder {
    return createEmbed({
        color: Colors.Success,
        author: { name: '🎵  Added to Queue' },
        title: track.info.title,
        description: [
            `**Artist** ─ ${track.info.author}`,
            `**Duration** ─ \`${track.info.isStream ? '🔴 LIVE' : formatDuration(track.info.length)}\``,
            `**Position in queue** ─ #${queuePosition}`,
        ].join('\n'),
        thumbnail: track.info.artworkUrl,
        footer: `Requested by ${track.requester.displayName}  •  Zorin Music`,
    });
}

// ── Playlist loaded embed ──
export function createPlaylistAddedEmbed(name: string, trackCount: number, totalDuration: number, requester: QueueTrack['requester']): EmbedBuilder {
    return createEmbed({
        color: Colors.Queue,
        author: { name: '📋  Playlist Loaded' },
        title: name,
        description: [
            `**Tracks** ─ \`${trackCount}\``,
            `**Total Duration** ─ \`${formatDuration(totalDuration)}\``,
        ].join('\n'),
        footer: `Requested by ${requester.displayName}  •  Zorin Music`,
    });
}

// ── Queue page embed ──
export function createQueueEmbed(queue: MusicQueue, page: number = 1): EmbedBuilder {
    const tracksPerPage = 10;
    const totalPages = Math.ceil(queue.size / tracksPerPage) || 1;
    const clampedPage = Math.max(1, Math.min(page, totalPages));

    const start = (clampedPage - 1) * tracksPerPage;
    const end = start + tracksPerPage;
    const pageTracks = queue.tracks.slice(start, end);

    let description = '';

    // Current track
    if (queue.current) {
        const dur = queue.current.info.isStream ? '🔴 LIVE' : formatDuration(queue.current.info.length);
        description += `**Now Playing**\n🎶 **[${queue.current.info.title}](${queue.current.info.uri ?? '#'})**\n└ 👤 ${queue.current.info.author} • ⏱️ \`${dur}\` • 👤 <@${queue.current.requester.id}>\n\n`;
    }

    // Upcoming tracks
    if (pageTracks.length > 0) {
        description += '**Up Next**\n\n';
        description += pageTracks.map((track, i) => {
            const idx = start + i + 1;
            const dur = track.info.isStream ? '🔴 LIVE' : formatDuration(track.info.length);
            return `\`${idx}.\` **[${track.info.title}](${track.info.uri ?? '#'})**\n└ 👤 ${track.info.author} • ⏱️ \`${dur}\` • 👤 <@${track.requester.id}>`;
        }).join('\n\n');
    } else if (!queue.current) {
        description += '*The queue is empty.*';
    }

    const loopIcon = queue.loop === 'track' ? '🔁 Track' : queue.loop === 'queue' ? '🔂 Queue' : '▶️ Off';

    return createEmbed({
        color: Colors.Queue,
        author: { name: '📜  Music Queue' },
        description,
        fields: [
            { name: '🔢  Tracks', value: `\`${queue.size}\``, inline: true },
            { name: '⏱️  Total Duration', value: `\`${formatDuration(queue.totalDuration)}\``, inline: true },
            { name: '🔄  Loop', value: loopIcon, inline: true },
        ],
        footer: `Page ${clampedPage} / ${totalPages}  •  Zorin Music`,
    });
}

// ── Now Playing Interactive Button Component Row ──
export function createNowPlayingComponents(queue: MusicQueue): ActionRowBuilder<ButtonBuilder>[] {
    const isPaused = queue.paused;
    const loopMode = queue.loop || 'off';

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_prev')
            .setEmoji('⏮️')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('btn_pause_toggle')
            .setEmoji(isPaused ? '▶️' : '⏸️')
            .setLabel(isPaused ? 'Resume' : 'Pause')
            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('btn_skip')
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('btn_loop_toggle')
            .setEmoji('🔁')
            .setLabel(loopMode === 'track' ? 'Loop: Track' : loopMode === 'queue' ? 'Loop: Queue' : 'Loop: Off')
            .setStyle(loopMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('btn_stop')
            .setEmoji('⏹️')
            .setStyle(ButtonStyle.Danger)
    );

    return [row];
}
