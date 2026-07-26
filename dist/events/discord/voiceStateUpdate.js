"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const embeds_1 = require("../../utils/embeds");
exports.default = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(client, oldState, newState) {
        const guildId = oldState.guild.id || newState.guild.id;
        const queue = client.queues.get(guildId);
        if (!queue)
            return;
        const guild = client.guilds.cache.get(guildId);
        if (!guild)
            return;
        const botVoiceChannelId = guild.members.me?.voice.channelId;
        if (!botVoiceChannelId)
            return;
        const voiceChannel = guild.channels.cache.get(botVoiceChannelId);
        if (!voiceChannel || !voiceChannel.isVoiceBased())
            return;
        // Count non-bot members in the voice channel
        const humanMembers = voiceChannel.members.filter(m => !m.user.bot);
        if (humanMembers.size === 0) {
            // Everyone left — start 2-minute alone leave timer if not already running
            if (!queue.leaveTimeout) {
                queue.leaveTimeout = setTimeout(async () => {
                    const ch = client.channels.cache.get(queue.textChannelId);
                    if (ch && ch.isSendable()) {
                        const embed = (0, embeds_1.createEmbed)({
                            color: embeds_1.Colors.Info,
                            title: '👋  Left Voice Channel',
                            description: 'Everyone left the voice channel, so I disconnected to conserve resources.',
                            footer: 'Zorin Music',
                        });
                        await ch.send({ embeds: [embed] }).catch(() => { });
                    }
                    client.destroyPlayer(guildId);
                }, 2 * 60 * 1000); // 2 minutes
            }
        }
        else {
            // Human user joined/re-joined — cancel alone leave timer
            queue.stopLeaveTimeout();
        }
    },
};
//# sourceMappingURL=voiceStateUpdate.js.map