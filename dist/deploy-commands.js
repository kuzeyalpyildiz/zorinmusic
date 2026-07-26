"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function deploy() {
    const commands = [];
    const base = path_1.default.join(__dirname, 'commands');
    const folders = fs_1.default.readdirSync(base);
    for (const folder of folders) {
        const folderPath = path_1.default.join(base, folder);
        if (!fs_1.default.statSync(folderPath).isDirectory())
            continue;
        const files = fs_1.default.readdirSync(folderPath).filter(f => f.endsWith('.js') && !f.endsWith('.d.ts'));
        for (const file of files) {
            const mod = require(path_1.default.join(folderPath, file));
            const command = mod.default ?? mod;
            commands.push(command.data.toJSON());
        }
    }
    const rest = new discord_js_1.REST({ version: '10' }).setToken(config_1.config.token);
    console.log(`[Deploy] Registering ${commands.length} slash command(s)…`);
    if (config_1.config.guildId) {
        // Guild-scoped (instant, good for testing)
        await rest.put(discord_js_1.Routes.applicationGuildCommands(config_1.config.clientId, config_1.config.guildId), { body: commands });
        console.log(`[Deploy] ✅ Registered to guild ${config_1.config.guildId}.`);
    }
    else {
        // Global (takes up to 1 hour to propagate)
        await rest.put(discord_js_1.Routes.applicationCommands(config_1.config.clientId), { body: commands });
        console.log('[Deploy] ✅ Registered globally.');
    }
}
deploy().catch((err) => {
    console.error('[Deploy] ❌ Error:', err);
    process.exit(1);
});
//# sourceMappingURL=deploy-commands.js.map