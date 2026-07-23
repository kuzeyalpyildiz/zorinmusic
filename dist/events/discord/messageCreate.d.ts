import { Message } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
declare const _default: {
    name: string;
    once: boolean;
    execute(client: ZorinClient, message: Message): Promise<void>;
};
export default _default;
