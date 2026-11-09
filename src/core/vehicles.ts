/**
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
