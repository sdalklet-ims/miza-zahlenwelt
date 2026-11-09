/**
 * Stationen = Mathe-Spiele/Aufträge, die in der Welt an Tieren und Objekten hängen.
 * Jede Welt registriert einen Starter; der öffnet den Spielbildschirm und ruft danach `back()` (zurück zu Mia).
 */
export type Offer = 'video' | 'discover' | 'check' | 'punkte' | 'steine' | 'kaertchen' | 'memory' | 'pilze' | 'shop';
export interface Npc { id: string; kind: string; name: string; x?: number; y?: number; hello: string; offers: string[] }
export type StationStarter = (offer: Offer, npc: Npc, back: () => void) => void;

export const stationStarters: Record<string, StationStarter> = {};
export const registerStations = (worldId: string, s: StationStarter) => void (stationStarters[worldId] = s);
