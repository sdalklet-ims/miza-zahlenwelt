/**
 * Leichte Musik, live erzeugt (WebAudio, keine Audiodateien). Mehrere „Sender“ (Radio im Haus):
 * Wald-Ambiente (Standard), Sonnenschein, Lagerfeuer, Gute Nacht. Plus kleine Effekte (Münze, Stern, Bauen).
 * Startet erst nach der ersten Berührung (iPad). Pausiert, wenn die Seite im Hintergrund ist.
 */
import { getProgress, mutate } from '../core/progress';

export interface Station {
  id: string; name: string; icon: string;
  chords: number[][]; chordLen: number; melody: number[]; gap: [number, number];
  voice: 'bell' | 'pluck' | 'marimba'; padVol: number; noteVol: number; bass?: boolean;
  /** Mit Rhythmusgruppe: Schläge pro Minute (sonst freie Flächen-Musik) */
  bpm?: number; swing?: number;
}

export const STATIONS: Station[] = [
  { id: 'wald', name: 'Fröhlicher Wald', icon: '🌲', chords: [[48, 52, 55, 59], [43, 50, 55, 59], [45, 52, 55, 60], [41, 48, 53, 57]], chordLen: 5, melody: [72, 74, 76, 79, 81, 84, 79, 76], gap: [0.3, 0.8], voice: 'marimba', padVol: 0.03, noteVol: 0.085, bpm: 94, swing: 0.02 },
  { id: 'sonne', name: 'Sonnenschein', icon: '☀️', chords: [[48, 55, 64], [43, 50, 59], [45, 52, 60], [41, 48, 57]], chordLen: 4, melody: [72, 74, 76, 79, 81, 84, 76, 79], gap: [0.32, 0.8], voice: 'marimba', padVol: 0.03, noteVol: 0.085, bass: true },
  { id: 'feuer', name: 'Lagerfeuer', icon: '🔥', chords: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 56]], chordLen: 8, melody: [69, 72, 74, 76, 79, 76, 72], gap: [0.7, 1.5], voice: 'pluck', padVol: 0.04, noteVol: 0.075 },
  { id: 'nacht', name: 'Gute Nacht', icon: '🌙', chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]], chordLen: 8, melody: [76, 72, 67, 72, 74, 69, 67], gap: [2.4, 4], voice: 'bell', padVol: 0.035, noteVol: 0.05 },
];
export const stationById = (id: string) => STATIONS.find((s) => s.id === id) ?? STATIONS[0];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bus: GainNode | null = null;
let timer = 0;
let nextChord = 0;
let chordIdx = 0;
let nextNote = 0;
let noteIdx = 0;
let station: Station = STATIONS[0];
let nextStep = 0;
let stepIdx = 0;
let noiseBuf: AudioBuffer | null = null;

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const level = () => {
  const s = getProgress().settings;
  return s.musicOn ? s.music : 0;
};

export function applyMusicSettings() {
  if (master && ctx) master.gain.setTargetAtTime(level() * 0.55, ctx.currentTime, 0.3);
}

export const currentStation = () => station.id;

/** Sender wechseln (Radio); der Sender wird gemerkt. persist=false: nur vorübergehend (z. B. beim Schlafen) */
export function setStation(id: string, persist = true) {
  station = stationById(id);
  if (persist) mutate((p) => void (p.settings.station = station.id));
  if (ctx) {
    nextChord = nextNote = nextStep = ctx.currentTime + 0.25;
    chordIdx = noteIdx = stepIdx = 0;
  }
}

function impulse(c: AudioContext) {
  const len = c.sampleRate * 3.2, buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  return buf;
}

function pad(t: number, note: number, dur: number, vol: number) {
  if (!ctx || !bus) return;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1100;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(2.6, dur * 0.35));
  g.gain.setValueAtTime(vol, t + dur - 0.4);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 3.2);
  f.connect(g); g.connect(bus);
  for (const det of [-5, 4]) {
    const o = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = hz(note); o.detune.value = det;
    o.connect(f); o.start(t); o.stop(t + dur + 3.4);
  }
}

function note(t: number, n: number, vel: number, voice: Station['voice'], vol: number) {
  if (!ctx || !bus) return;
  const decay = voice === 'bell' ? 3.2 : voice === 'pluck' ? 1.5 : 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol * vel, t + (voice === 'bell' ? 0.02 : 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  g.connect(bus);
  const o = ctx.createOscillator();
  o.type = voice === 'pluck' ? 'triangle' : 'sine';
  o.frequency.value = hz(n);
  o.connect(g);
  o.start(t); o.stop(t + decay + 0.1);
  const o2 = ctx.createOscillator(), g2 = ctx.createGain();
  o2.type = 'sine'; o2.frequency.value = hz(n) * (voice === 'marimba' ? 4 : 2.01);
  g2.gain.value = voice === 'marimba' ? 0.35 : 0.22;
  o2.connect(g2); g2.connect(g);
  o2.start(t); o2.stop(t + decay + 0.1);
}

/* ───────── Rhythmusgruppe ───────── */
function kick(t: number, vol: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(125, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.13);
  g.gain.setValueAtTime(0.22 * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
}
function noiseHit(t: number, vol: number, kind: 'hat' | 'clap') {
  if (!ctx || !master || !noiseBuf) return;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf;
  f.type = kind === 'hat' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'hat' ? 7500 : 1600;
  f.Q.value = 0.9;
  const len = kind === 'hat' ? 0.05 : 0.16;
  g.gain.setValueAtTime((kind === 'hat' ? 0.07 : 0.1) * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f); f.connect(g); g.connect(kind === 'clap' && bus ? bus : master);
  src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02);
}

/** Entspannter Groove: 16 Schritte pro Takt, leicht geswingt; Akkord alle 2 Takte */
function beatSchedule() {
  if (!ctx) return;
  const st = station, now = ctx.currentTime, sp = 60 / (st.bpm as number) / 4;
  while (nextStep < now + 1.4) {
    const s = stepIdx % 16;
    const t = nextStep + (s % 2 ? st.swing ?? 0.015 : 0);
    const chord = st.chords[Math.floor(stepIdx / 32) % st.chords.length];
    if (stepIdx % 32 === 0) chord.forEach((n, i) => pad(t + i * 0.02, n, sp * 32, st.padVol));
    if (s === 0 || s === 6 || s === 8) kick(t, s === 6 ? 0.6 : 1);
    if (s === 4 || s === 12) noiseHit(t, 0.55, 'clap');
    if (s % 2 === 0) noiseHit(t, s % 4 === 2 ? 1 : 0.55, 'hat');
    else if (Math.random() < 0.3) noiseHit(t, 0.3, 'hat');
    const root = chord[0] - 12;
    if (s === 0 || s === 8) note(t, root, 1, 'pluck', 0.13);
    if (s === 6) note(t, root + 12, 0.7, 'pluck', 0.09);
    if (s === 14) note(t, root + 7, 0.7, 'pluck', 0.09);
    if (s % 2 === 1 && Math.random() < 0.45) note(t, st.melody[Math.floor(Math.random() * st.melody.length)] - (Math.random() < 0.15 ? 12 : 0), 0.7 + Math.random() * 0.4, st.voice, st.noteVol);
    stepIdx++;
    nextStep += sp;
  }
}

function schedule() {
  if (!ctx) return;
  if (station.bpm) return beatSchedule();
  const now = ctx.currentTime, st = station;
  while (nextChord < now + 6) {
    const ch = st.chords[chordIdx % st.chords.length];
    ch.forEach((n, i) => pad(nextChord + i * 0.15, n, st.chordLen + 0.2, st.padVol));
    if (st.bass) for (let b = 0; b < st.chordLen; b += 1) note(nextChord + b, ch[0] - 12, b % 2 ? 0.6 : 1, 'pluck', 0.09);
    chordIdx++;
    nextChord += st.chordLen;
  }
  while (nextNote < now + 4) {
    const n = st.melody[(st.id === 'wald' ? Math.floor(Math.random() * st.melody.length) : noteIdx++ % st.melody.length)] - (Math.random() < 0.2 ? 12 : 0);
    note(nextNote, n, 0.6 + Math.random() * 0.5, st.voice, st.noteVol);
    nextNote += st.gap[0] + Math.random() * (st.gap[1] - st.gap[0]);
  }
}

export function startMusic() {
  try {
    if (ctx) {
      void ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    station = stationById(getProgress().settings.station);
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    bus = ctx.createGain();
    const dry = ctx.createGain(); dry.gain.value = 0.7;
    const wet = ctx.createGain(); wet.gain.value = 0.55;
    const conv = ctx.createConvolver(); conv.buffer = impulse(ctx);
    const delay = ctx.createDelay(); delay.delayTime.value = 0.46;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    delay.connect(fb); fb.connect(delay);
    bus.connect(dry); bus.connect(conv); bus.connect(delay); delay.connect(conv);
    conv.connect(wet); dry.connect(master); wet.connect(master);
    nextChord = nextNote = nextStep = ctx.currentTime + 0.3;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    schedule();
    timer = window.setInterval(schedule, 500);
    master.gain.setTargetAtTime(level() * 0.55, ctx.currentTime, 2.5);
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    });
  } catch {
    /* kein Ton möglich – das Spiel funktioniert trotzdem */
  }
}

/* ───────── kleine Effekte ───────── */
function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  if (!ctx || !master || level() === 0) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

export const sfx = {
  coin: () => { tone(988, 0.12, 'sine', 0.16); tone(1319, 0.3, 'sine', 0.14, 0.09); },
  star: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.35, 'triangle', 0.14, i * 0.09)),
  build: () => { tone(160, 0.25, 'sine', 0.3, 0, 60); tone(520, 0.08, 'square', 0.05, 0.02); },
  buy: () => { tone(660, 0.1, 'triangle', 0.14); tone(880, 0.18, 'triangle', 0.14, 0.08); },
  pop: () => tone(520, 0.12, 'sine', 0.14, 0, 900),
  munch: () => { tone(220, 0.07, 'square', 0.05); tone(260, 0.07, 'square', 0.05, 0.1); tone(220, 0.07, 'square', 0.05, 0.2); },
  click: () => tone(1200, 0.05, 'square', 0.04),
};

export function stopMusic() {
  clearInterval(timer);
  void ctx?.close();
  ctx = null;
}
