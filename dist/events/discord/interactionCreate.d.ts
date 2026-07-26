import { Interaction } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
declare const _default: {
    name: string;
    once: boolean;
    execute(client: ZorinClient, interaction: Interaction): Promise<void>;
};
export default _default;
