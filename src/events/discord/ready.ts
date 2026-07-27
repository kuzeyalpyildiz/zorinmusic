import { ActivityType, REST, Routes } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
import { config } from '../../config';

export default {
    name: 'clientReady',
    once: true,
    execute(client: ZorinClient) {
        console.log(`[Zorin Music] 🎵 Logged in as ${client.user?.tag}`);
        console.log(`[Zorin Music] 🌐 Serving ${client.guilds.cache.size} guild(s).`);

        // Reconnect active players from players.json store
        client.reconnectActivePlayers().catch(err => {
            console.warn('[Zorin Music] ⚠️ Error reconnecting active players:', err);
        });

        // Asynchronous non-blocking slash command registration (0ms boot delay)
        (async () => {
            try {
                const commandsData = Array.from(client.commands.values()).map((cmd: any) => cmd.data.toJSON() as object);
                const rest = new REST({ version: '10' }).setToken(config.token);

                if (config.guildId) {
                    await rest.put(
                        Routes.applicationGuildCommands(config.clientId || client.user!.id, config.guildId),
                        { body: commandsData },
                    );
                    console.log(`[Zorin Music] ✅ Auto-registered ${commandsData.length} slash commands to guild ${config.guildId}.`);
                } else if (client.user?.id) {
                    await rest.put(
                        Routes.applicationCommands(config.clientId || client.user.id),
                        { body: commandsData },
                    );
                    console.log(`[Zorin Music] ✅ Auto-registered ${commandsData.length} slash commands globally.`);
                }
            } catch (err) {
                console.error('[Zorin Music] ⚠️ Failed to auto-deploy slash commands:', err);
            }
        })();

        // Rotate activity status
        const activities = [
            { name: '/play • Zorin Music', type: ActivityType.Listening },
            { name: '/help • Zorin Music', type: ActivityType.Playing },
            { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
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
