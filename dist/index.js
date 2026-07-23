"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ZorinClient_1 = require("./structures/ZorinClient");
console.log('━'.repeat(50));
console.log('  🎵  Zorin Music  •  Starting up …');
console.log('━'.repeat(50));
const client = new ZorinClient_1.ZorinClient();
client.start().catch((err) => {
    console.error('[Zorin Music] ❌ Fatal startup error:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map