import { REST, Routes } from 'discord.js';
import { config } from './config';
import fs from 'fs';
import path from 'path';
import { ZorinCommand } from './types';

async function deploy() {
    const commands: object[] = [];

    const base = path.join(__dirname, 'commands');
    const folders = fs.readdirSync(base);

    for (const folder of folders) {
        const folderPath = path.join(base, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js') && !f.endsWith('.d.ts'));
        for (const file of files) {
            const mod = require(path.join(folderPath, file));
            const command: ZorinCommand = mod.default ?? mod;
            commands.push(command.data.toJSON() as object);
        }
    }

    const rest = new REST({ version: '10' }).setToken(config.token);

    console.log(`[Deploy] Registering ${commands.length} slash command(s)…`);

    if (config.guildId) {
        // Guild-scoped (instant, good for testing)
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );
        console.log(`[Deploy] ✅ Registered to guild ${config.guildId}.`);
    } else {
        // Global (takes up to 1 hour to propagate)
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands },
        );
        console.log('[Deploy] ✅ Registered globally.');
    }
}

deploy().catch((err) => {
    console.error('[Deploy] ❌ Error:', err);
    process.exit(1);
});
