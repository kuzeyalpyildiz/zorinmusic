import { ZorinClient } from './structures/ZorinClient';

console.log('━'.repeat(50));
console.log('  🎵  Zorin Music  •  Starting up …');
console.log('━'.repeat(50));

const client = new ZorinClient();
client.start().catch((err) => {
    console.error('[Zorin Music] ❌ Fatal startup error:', err);
    process.exit(1);
});
