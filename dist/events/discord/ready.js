"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../../config");
exports.default = {
    name: 'clientReady',
    once: true,
    execute(client) {
        console.log(`[Zorin Music] 🎵 Logged in as ${client.user?.tag}`);
        console.log(`[Zorin Music] 🌐 Serving ${client.guilds.cache.size} guild(s).`);
        // Reconnect active players from players.json store
        client.reconnectActivePlayers().catch(err => {
            console.warn('[Zorin Music] ⚠️ Error reconnecting active players:', err);
        });
        // Asynchronous non-blocking slash command registration (0ms boot delay)
        (async () => {
            try {
                const commandsData = Array.from(client.commands.values()).map((cmd) => cmd.data.toJSON());
                const rest = new discord_js_1.REST({ version: '10' }).setToken(config_1.config.token);
                if (config_1.config.guildId) {
                    await rest.put(discord_js_1.Routes.applicationGuildCommands(config_1.config.clientId || client.user.id, config_1.config.guildId), { body: commandsData });
                    console.log(`[Zorin Music] ✅ Auto-registered ${commandsData.length} slash commands to guild ${config_1.config.guildId}.`);
                }
                else if (client.user?.id) {
                    await rest.put(discord_js_1.Routes.applicationCommands(config_1.config.clientId || client.user.id), { body: commandsData });
                    console.log(`[Zorin Music] ✅ Auto-registered ${commandsData.length} slash commands globally.`);
                }
            }
            catch (err) {
                console.error('[Zorin Music] ⚠️ Failed to auto-deploy slash commands:', err);
            }
        })();
        // Rotate activity status
        const activities = [
            { name: '/play • Zorin Music', type: discord_js_1.ActivityType.Listening },
            { name: '/help • Zorin Music', type: discord_js_1.ActivityType.Playing },
            { name: `${client.guilds.cache.size} servers`, type: discord_js_1.ActivityType.Watching },
        ];
        let index = 0;
        const setActivity = () => {
            const activity = activities[index % activities.length];
            client.user?.setActivity(activity.name, { type: activity.type });
            index++;
        };
        setActivity();
        setInterval(setActivity, 30_000);
    },
};
