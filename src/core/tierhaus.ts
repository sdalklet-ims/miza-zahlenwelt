/**
 * Tierhaus: Zoom-Ansicht im Haus, in der die gekauften Haustiere wohnen, schlafen und mit Gadgets spielen.
 * Gadgets (content/tierhaus.json) schalten sich automatisch ab einer Gesamt-Sternenzahl frei – Sterne werden nicht ausgegeben.
 */
import { tierCfg, type TierGadget } from './texts';
import { getProgress, mutate } from './progress';
import { totalStars } from './rewards';
import { pets } from './pet';

export const gadgets: TierGadget[] = tierCfg.gadgets;
export const gadgetUnlocked = (g: TierGadget) => totalStars() >= g.stars;
/** Im Haus aufgestellt: freigeschaltet und mindestens ein passendes Tier wohnt dort */
export const gadgetActive = (g: TierGadget) => gadgetUnlocked(g) && (g.animal === 'alle' ? pets().length > 0 : pets().some((p) => p.kind === g.animal));
export const newGadgets = () => gadgets.filter((g) => gadgetActive(g) && !getProgress().tierSeen.includes(g.id));
export const markGadgetsSeen = () => mutate((p) => void (p.tierSeen = [...new Set([...p.tierSeen, ...gadgets.filter(gadgetActive).map((g) => g.id)])]));
