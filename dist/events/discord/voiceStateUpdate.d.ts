import { VoiceState } from 'discord.js';
import { ZorinClient } from '../../structures/ZorinClient';
declare const _default: {
    name: string;
    once: boolean;
    execute(client: ZorinClient, oldState: VoiceState, newState: VoiceState): Promise<void>;
};
export default _default;
