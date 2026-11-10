// Erzeugt einen Spielstand-Code (Einstellungen → Spielstand laden) mit festem Teststand.
import { readFileSync, writeFileSync } from 'node:fs';
const house = JSON.parse(readFileSync('content/house.json', 'utf-8'));
const now = Date.now();
const core = Object.fromEntries(house.core.map((id) => [id, true]));
const data = {
  v: 1, stars: { 'wald.punkte': 3, 'wald.steine': 3 }, levels: {}, found: [], equipped: { 'mia.kopf': 'mia-zipfel' },
  weak: {}, seen: {}, mapAt: 'wald', discovered: {}, coins: 2, coinsGot: {},
  house: { owned: { ...core }, built: { ...core }, roof: '#d9534f', wall: '#fff0d4', stage: 2 }, posV: 0,
  pets: [
    { kind: 'wellensittich', name: 'Mago', fill: 100, t: now, fed: 0 },
    { kind: 'hamster', name: 'Krümel', fill: 100, t: now, fed: 0 },
  ],
  petStock: {}, pack: { umbrella: true }, unlocked: {}, hunger: { fill: 100, t: now }, meals: { apfel: 2 },
  vehicles: {}, ride: null, charge: {}, badges: { 'wald.punkte': 2 },
  aqua: { fish: {}, food: 0, fill: 80, t: now }, tierSeen: [], passed: {},
};
const code = Buffer.from(JSON.stringify({ mia: 1, data }), 'utf-8').toString('base64');
writeFileSync('spielstand-test.txt', code);
console.log(house.core.join(','), code.length);
