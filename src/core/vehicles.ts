/** Fahrzeuge: Im Autohaus gekauft (teurer als Supermarkt-Ware), machen sie Mia schneller – die Welt wird ja immer größer. */
import { vehicleCfg, type VehicleDef } from './texts';
import { getProgress, mutate } from './progress';
import { addCoins, coins } from './rewards';

export const vehicles: VehicleDef[] = vehicleCfg.vehicles;
export const vehicleById = (id: string) => vehicles.find((v) => v.id === id)!;
export const owns = (id: string) => !!getProgress().vehicles[id];
export const ownedAny = () => vehicles.some((v) => owns(v.id));
export const currentRide = (): VehicleDef | null => { const r = getProgress().ride; return r && owns(r) ? vehicleById(r) : null; };
export const rideSpeed = () => currentRide()?.speed ?? 1;

export function buyVehicle(id: string): boolean {
  const v = vehicleById(id);
  if (owns(id) || coins() < v.price) return false;
  addCoins(-v.price);
  mutate((p) => { p.vehicles[id] = true; p.ride = id; });
  return true;
}

export function setRide(id: string | null) {
  mutate((p) => void (p.ride = id && p.vehicles[id] ? id : null));
}
