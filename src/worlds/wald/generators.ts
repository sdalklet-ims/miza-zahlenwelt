/**
 * Aufgaben werden aus Regeln (content/worlds/wald.json → games.*.levels) erzeugt, nicht hartcodiert.
 * Stolpersteine (Zahlendreher, Nullen in der Mitte, unterschiedliche Stellenzahl, Übergänge)
 * kommen je nach Stufe häufiger vor – und noch häufiger, wenn das Kind dort Fehler macht.
 */
import { pick, rnd, shuffle } from '../../core/dom';
import { getProgress, mutate } from '../../core/progress';

export type Trap = 'dreher' | 'null' | 'kurz' | 'aehnlich' | 'uebergang';
export interface PunkteRule { h: [number, number]; z: [number, number]; e: [number, number]; traps: Trap[]; trapChance: number }
export interface CardRule { allowZero: boolean; allowDup: boolean; nearSame?: boolean }

export const digitsOf = (n: number): [number, number, number] => [Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10];
export const numOf = (h: number, z: number, e: number) => h * 100 + z * 10 + e;

const WEAK_KEY: Record<Trap, string> = { dreher: 'dreher', aehnlich: 'dreher', null: 'null', kurz: 'kurz', uebergang: 'null' };
const SIMILAR: [number, number][] = [[898, 989], [969, 696], [686, 868], [101, 110], [505, 550], [787, 878], [303, 330], [404, 440]];
const BOUNDARY = [99, 100, 109, 190, 199, 200, 299, 300, 899, 900, 909, 990, 989, 898, 999];

export type ErrorKind = 'ok' | 'dreher' | 'null' | 'kurz' | 'other';

/** Wie hat sich das Kind vertan? Steuert den passenden Hinweis. */
export function classifyError(target: number, answer: number): ErrorKind {
  const t = String(target), a = String(answer);
  if (t === a) return 'ok';
  const sorted = (s: string) => s.split('').sort().join('');
  if (t.length === a.length && sorted(t) === sorted(a)) return 'dreher';
  if (t.length !== a.length && t.replace(/0/g, '') === a.replace(/0/g, '')) return 'null';
  if (t.length !== a.length) return 'kurz';
  return 'other';
}

export function noteMistake(kind: ErrorKind) {
  if (kind === 'ok' || kind === 'other') return;
  mutate((p) => void (p.weak[kind] = (p.weak[kind] ?? 0) + 1));
}

export class NumberGen {
  private queue: number[] = [];
  private last: number[] = [];
  constructor(private rules: PunkteRule[]) {}

  next(level: number): number {
    const rule = this.rules[Math.max(0, Math.min(this.rules.length - 1, level - 1))];
    let n = this.queue.length ? this.queue.shift()! : this.fresh(rule);
    for (let i = 0; i < 12 && this.last.includes(n); i++) n = this.fresh(rule);
    this.last.push(n);
    if (this.last.length > 4) this.last.shift();
    return n;
  }

  private fresh(rule: PunkteRule): number {
    if (rule.traps.length && Math.random() < rule.trapChance) {
      const n = this.trap(this.weighted(rule.traps));
      if (n != null) return n;
    }
    for (;;) {
      const n = numOf(rnd(...rule.h), rnd(...rule.z), rnd(...rule.e));
      if (n > 0) return n;
    }
  }

  private weighted(traps: Trap[]): Trap {
    const weak = getProgress().weak;
    const w = traps.map((t) => 1 + Math.min(weak[WEAK_KEY[t]] ?? 0, 6) * 0.8);
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < traps.length; i++) if ((r -= w[i]) <= 0) return traps[i];
    return traps[0];
  }

  private trap(kind: Trap): number | null {
    switch (kind) {
      case 'dreher': {
        const d = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
        const n = numOf(d[0], d[1], d[2]);
        const swapped = Math.random() < 0.5 ? numOf(d[0], d[2], d[1]) : numOf(d[1], d[0], d[2]);
        this.queue.push(swapped);
        return n;
      }
      case 'aehnlich': {
        const [a, b] = pick(SIMILAR);
        const flip = Math.random() < 0.5;
        this.queue.push(flip ? a : b);
        return flip ? b : a;
      }
      case 'null': {
        const a = rnd(1, 9), b = rnd(1, 9);
        const forms = [numOf(a, 0, b), numOf(a, b, 0), numOf(a, 0, 0)];
        const n = pick(forms);
        if (n === forms[0]) this.queue.push(forms[1]);
        else if (n === forms[1]) this.queue.push(forms[0]);
        return n;
      }
      case 'kurz': {
        const a = rnd(1, 9);
        let b = rnd(1, 9);
        if (b === a) b = (b % 9) + 1;
        const n = a * 10 + b;
        this.queue.push(pick([a * 100 + b, a * 100 + b * 10]));
        return n;
      }
      case 'uebergang':
        return pick(BOUNDARY);
    }
  }
}

/* ───────── Kärtchen ───────── */
export function permutations(d: number[]): number[][] {
  const out: number[][] = [];
  const idx = [0, 1, 2];
  for (const a of idx) for (const b of idx) for (const c of idx) if (a !== b && b !== c && a !== c) out.push([d[a], d[b], d[c]]);
  return out;
}

/** Größte bzw. kleinste dreistellige Zahl (vorn keine Null). */
export function bestNumber(d: number[], mode: 'max' | 'min'): number {
  const vals = permutations(d).filter((p) => p[0] !== 0).map((p) => numOf(p[0], p[1], p[2]));
  return mode === 'max' ? Math.max(...vals) : Math.min(...vals);
}

export function genCards(rule: CardRule, mode: 'max' | 'min'): number[] {
  for (let tries = 0; tries < 200; tries++) {
    let d: number[];
    const lo = rule.allowZero ? 0 : 1;
    if (rule.nearSame) {
      const base = rnd(Math.max(lo, 1), 8);
      d = [base, pick([base, base + 1]), pick([base, base + 1, base - 1 < lo ? base : base - 1])];
    } else if (rule.allowDup) {
      d = [rnd(lo, 9), rnd(lo, 9), rnd(lo, 9)];
    } else {
      d = shuffle(Array.from({ length: 10 - lo }, (_, i) => i + lo)).slice(0, 3);
    }
    if (d.filter((x) => x === 0).length > 1) continue;
    if (rule.allowZero && mode === 'min' && !d.includes(0) && Math.random() < 0.6) continue; // Null-Falle öfter üben
    if (new Set(d).size === 1 && !rule.nearSame && Math.random() < 0.8) continue;
    return shuffle(d);
  }
  return [3, 5, 2];
}

/** Hugo legt (meistens) nicht die beste Zahl */
export function hugoNumber(d: number[], mode: 'max' | 'min'): number {
  const best = bestNumber(d, mode);
  const others = permutations(d).filter((p) => p[0] !== 0).map((p) => numOf(p[0], p[1], p[2])).filter((n) => n !== best);
  return others.length ? pick(others) : best;
}
