/**
 * Wetter: ab und zu regnet es draußen. Mit dem Regenschirm aus dem Rucksack bleibt Mia trocken;
 * ohne Schirm wird sie nass und ist ein bisschen langsamer – kein Game Over, nur ein freundlicher Hinweis.
 */
import { getProgress, mutate } from './progress';

const w = { raining: false, left: 70 + Math.random() * 60, level: 0, wet: 0, umbrella: false };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const onWeather = (cb: () => void) => (subs.add(cb), () => subs.delete(cb));
export const weather = w;
export const hasUmbrella = () => !!getProgress().pack.umbrella;

export function setUmbrella(on: boolean) {
  if (on && !hasUmbrella()) return;
  w.umbrella = on;
  emit();
}

/** Ein Schritt in Sekunden; gibt Ereignisse zurück (für Hinweise). */
export function tickWeather(dt: number, sheltered: boolean): 'start' | 'stop' | 'wet' | null {
  let ev: 'start' | 'stop' | 'wet' | null = null;
  w.left -= dt;
  if (w.left <= 0) {
    w.raining = !w.raining;
    w.left = w.raining ? 45 + Math.random() * 40 : 110 + Math.random() * 120;
    ev = w.raining ? 'start' : 'stop';
    if (!w.raining && w.umbrella) w.umbrella = false;
    emit();
  }
  w.level += ((w.raining ? 1 : 0) - w.level) * (1 - Math.exp(-0.8 * dt));
  const soaked = w.raining && w.level > 0.5 && !w.umbrella && !sheltered;
  const before = w.wet;
  w.wet = Math.max(0, Math.min(1, w.wet + (soaked ? 0.05 : -0.04) * dt));
  if (before < 0.35 && w.wet >= 0.35) ev = ev ?? 'wet';
  return ev;
}

/** Zum Testen: Regen sofort an/aus */
export function forceRain(on: boolean) {
  w.raining = on; w.left = 60; emit();
}

export function giveUmbrella() { mutate((p) => void (p.pack.umbrella = true)); }
