"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Colors = void 0;
exports.formatDuration = formatDuration;
exports.renderProgressBar = renderProgressBar;
exports.createEmbed = createEmbed;
exports.createSuccessEmbed = createSuccessEmbed;
exports.createErrorEmbed = createErrorEmbed;
exports.createWarningEmbed = createWarningEmbed;
exports.createInfoEmbed = createInfoEmbed;
exports.createNowPlayingEmbed = createNowPlayingEmbed;
exports.createTrackAddedEmbed = createTrackAddedEmbed;
exports.createPlaylistAddedEmbed = createPlaylistAddedEmbed;
exports.createQueueEmbed = createQueueEmbed;
const discord_js_1 = require("discord.js");
// ── Zorin Music colour palette ──
exports.Colors = {
    Primary: 0x7C3AED, // Vivid Purple
    Success: 0x10B981, // Emerald
    Error: 0xEF4444, // Red
    Warning: 0xF59E0B, // Amber
    Music: 0xEC4899, // Pink
    Info: 0x3B82F6, // Blue
    Queue: 0x8B5CF6, // Violet
};
// ── Duration formatter  (ms → "3:42" or "1:02:15") ──
function formatDuration(ms) {
    if (ms <= 0)
        return '0:00';
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
function renderProgressBar(current, total, size = 15) {
    if (total <= 0)
        return '▬'.repeat(size);
    const progress = Math.round((current / total) * size);
    const filled = '▬'.repeat(Math.max(0, progress));
    const empty = '▬'.repeat(Math.max(0, size - progress - 1));
    return `${filled}🔘${empty}`;
}
// ── Base embed factory ──
function createEmbed(options) {
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(options.color ?? exports.Colors.Primary)
        .setTimestamp();
    if (options.title)
        embed.setTitle(options.title);
    if (options.description)
        embed.setDescription(options.description);
    if (options.thumbnail)
        embed.setThumbnail(options.thumbnail);
    if (options.footer)
        embed.setFooter({ text: options.footer });
    if (options.fields)
        embed.addFields(options.fields);
    if (options.author)
        embed.setAuthor(options.author);
    return embed;
}
// ── Pre-styled shorthand embeds ──
function createSuccessEmbed(description) {
    return createEmbed({
        color: exports.Colors.Success,
        description: `✅  ${description}`,
        footer: 'Zorin Music',
    });
}
function createErrorEmbed(description) {
    return createEmbed({
        color: exports.Colors.Error,
        description: `❌  ${description}`,
        footer: 'Zorin Music',
    });
}
function createWarningEmbed(description) {
    return createEmbed({
        color: exports.Colors.Warning,
        description: `⚠️  ${description}`,
        footer: 'Zorin Music',
    });
}
function createInfoEmbed(description) {
    return createEmbed({
        color: exports.Colors.Info,
        description: `ℹ️  ${description}`,
        footer: 'Zorin Music',
    });
}
// ── Now Playing embed ──
function createNowPlayingEmbed(track, position = 0) {
    const bar = renderProgressBar(position, track.info.length);
    const elapsed = formatDuration(position);
    const total = track.info.isStream ? '🔴 LIVE' : formatDuration(track.info.length);
    return createEmbed({
        color: exports.Colors.Music,
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
function createTrackAddedEmbed(track, queuePosition) {
    return createEmbed({
        color: exports.Colors.Success,
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
function createPlaylistAddedEmbed(name, trackCount, totalDuration, requester) {
    return createEmbed({
        color: exports.Colors.Queue,
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
function createQueueEmbed(queue, page = 1) {
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
    }
    else if (!queue.current) {
        description += '*The queue is empty.*';
    }
    const loopIcon = queue.loop === 'track' ? '🔁 Track' : queue.loop === 'queue' ? '🔂 Queue' : '▶️ Off';
    return createEmbed({
        color: exports.Colors.Queue,
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
//# sourceMappingURL=embeds.js.map