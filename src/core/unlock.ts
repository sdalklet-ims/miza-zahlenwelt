/** Welt-Freischaltung. Wie Mia in eine neue Welt kommt, wird später festgelegt – bis dahin gibt es einen Test-Schalter in den Einstellungen. */
import { worlds } from './texts';
import { getProgress, mutate } from './progress';

export const worldUnlocked = (id: string) => worlds[0]?.id === id || !!getProgress().unlocked[id];
export const setWorldUnlocked = (id: string, on: boolean) => mutate((p) => void (p.unlocked[id] = on));
