# Einmaliges Hilfsskript: nur noch 3 Fahrzeuge (Fahrrad, E-Roller, E-Auto), Akku-Daten, Texte
import json


def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:60])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


vehicles = [
    {"id": "fahrrad", "name": "Fahrrad", "icon": "🚲", "price": 40, "speed": 1.35, "blurb": "Klingeling! Etwas schneller als zu Fuß und braucht keinen Strom."},
    {"id": "eroller", "name": "E-Roller", "icon": "🛴", "price": 120, "speed": 1.8, "range": 200, "blurb": "Leise und flott. Der Akku muss ab und zu an die Ladestation."},
    {"id": "eauto", "name": "E-Auto (Cabrio)", "icon": "🚗", "price": 300, "speed": 2.5, "range": 160, "blurb": "Das schnellste Fahrzeug. Auch hier muss der Akku geladen werden."},
]
texts = {
    "wald.rocky.hello": ["rocky", "Brumm, brumm! Ich bin Rocky. Bei mir gibt es ein Fahrrad, einen E-Roller und ein E-Auto. Die Welt ist groß, da lohnt sich Tempo! Die Elektro-Fahrzeuge laden an den Ladestationen."],
    "car.buy": ["mia", "Der {name} gehört jetzt mir! Auf geht's!"],
    "car.poor": ["mia", "Dafür fehlen mir noch ein paar Münzen. Ich sammle weiter bei den Aufgaben."],
    "car.ride.on": ["mia", "Los geht's mit dem {name}!"],
    "car.ride.off": ["mia", "Ich gehe wieder zu Fuß."],
    "car.house": ["mia", "Im Haus laufe ich lieber zu Fuß."],
    "car.rocky.visit": ["rocky", "Schau dich in Ruhe um. Probefahren ist inklusive, sobald du dein Fahrzeug gekauft hast!"],
    "car.battery.low": ["mia", "Der Akku wird leer. Ich suche eine Ladestation!"],
    "car.battery.empty": ["mia", "Akku leer! Jetzt geht es nur noch im Schneckentempo. Zur Ladestation!"],
    "car.charge.none": ["mia", "Hier kann ich meinen E-Roller und mein E-Auto aufladen. Dafür brauche ich erst eins davon."],
    "car.charge.full": ["mia", "Der Akku ist schon voll. Weiter geht's!"],
    "car.charge.start": ["mia", "Stecker rein! Der Akku lädt."],
    "car.charge.done": ["mia", "Voll geladen! Die Fahrt kann weitergehen."],
}
json.dump({"vehicles": vehicles, "texts": texts}, open('content/vehicles.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

ed('src/core/texts.ts', [("price: number; speed: number; blurb: string; canopy?: boolean }", "price: number; speed: number; blurb: string; canopy?: boolean; range?: number }")])
ed('src/core/progress.ts', [
    ("  ride: string | null;", "  ride: string | null;\n  /** Akkustand (0–100) der Elektro-Fahrzeuge */\n  charge: Record<string, number>;"),
    ("  ride: null,", "  ride: null,\n  charge: {},")])
open('src/core/vehicles.ts', 'w', encoding='utf-8').write("""/**
 * Fahrzeuge: Im Autohaus gekauft (teurer als Supermarkt-Ware), machen sie Mia schneller – die Welt wird ja immer größer.
 * E-Roller und E-Auto haben einen Akku, der beim Fahren leerer wird und an Ladestationen wieder voll wird.
 * Kein Game Over: Ist der Akku leer, geht es nur noch im Schneckentempo (langsamer als zu Fuß).
 */
import { vehicleCfg, type VehicleDef } from './texts';
import { getProgress, mutate } from './progress';
import { addCoins, coins } from './rewards';

export const vehicles: VehicleDef[] = vehicleCfg.vehicles;
export const vehicleById = (id: string) => vehicles.find((v) => v.id === id);
export const owns = (id: string) => !!getProgress().vehicles[id] && !!vehicleById(id);
export const ownedAny = () => vehicles.some((v) => owns(v.id));
export const currentRide = (): VehicleDef | null => { const r = getProgress().ride; return r && owns(r) ? vehicleById(r)! : null; };
export const hasBattery = (v: VehicleDef | null) => !!v?.range;

export const chargeOf = (id: string) => getProgress().charge[id] ?? 100;
export const batteryEmpty = () => { const v = currentRide(); return hasBattery(v) && chargeOf(v!.id) <= 0.5; };
/** Tempo-Faktor des aktuellen Fahrzeugs (leerer Akku = Schneckentempo) */
export const rideSpeed = () => { const v = currentRide(); if (!v) return 1; return batteryEmpty() ? 0.55 : v.speed; };

let lastSave = 0;
/** Akku beim Fahren entladen; `load` = Auslastung 0–1. Gespeichert wird nur alle paar Sekunden. */
export function drainBattery(dt: number, load: number): number {
  const v = currentRide();
  if (!v || !v.range) return 100;
  const s = getProgress();
  const next = Math.max(0, chargeOf(v.id) - (100 / v.range) * dt * (0.25 + 0.75 * load));
  s.charge[v.id] = next;
  if (Date.now() - lastSave > 3000) { lastSave = Date.now(); mutate(() => {}); }
  return next;
}

export const needsCharge = () => vehicles.some((v) => v.range && owns(v.id) && chargeOf(v.id) < 99.5);
export const ownsElectric = () => vehicles.some((v) => v.range && owns(v.id));
export function chargeAll(dt: number, perSec: number) {
  const s = getProgress();
  for (const v of vehicles) if (v.range && owns(v.id)) s.charge[v.id] = Math.min(100, chargeOf(v.id) + perSec * dt);
}
export function saveCharge() { mutate(() => {}); }

export function buyVehicle(id: string): boolean {
  const v = vehicleById(id);
  if (!v || owns(id) || coins() < v.price) return false;
  addCoins(-v.price);
  mutate((p) => { p.vehicles[id] = true; p.ride = id; p.charge[id] = 100; });
  return true;
}

export function setRide(id: string | null) {
  mutate((p) => void (p.ride = id && p.vehicles[id] ? id : null));
}
""")
ed('src/audio/music.ts', [("  vroom:", "  whirr: () => { tone(180, 0.45, 'sine', 0.07, 0, 720); tone(360, 0.45, 'triangle', 0.03, 0.02, 1100); },\n  zap: () => { tone(900, 0.08, 'square', 0.04, 0, 1800); },\n  vroom:")])
print('ok')
