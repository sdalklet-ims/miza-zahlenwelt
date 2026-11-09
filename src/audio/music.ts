/**
 * Leichte Ambient-Musik, live erzeugt (WebAudio, keine Audiodateien): weiche Akkord-Flächen mit Hall,
 * dazu einzelne sanfte Glockentöne aus einer Pentatonik. Plus kleine Effekte (Münze, Stern, Bauen).
 * Startet erst nach der ersten Berührung (iPad). Pausiert, wenn die Seite im Hintergrund ist.
 */
import { getProgress } from '../core/progress';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bus: GainNode | null = null;
let timer = 0;
let nextChord = 0;
let chordIdx = 0;
let nextNote = 0;

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
// C-Dur-Pentatonik-Akkorde: Cmaj9 – Am9 – Fmaj7 – G6/9
const CHORDS = [[48, 55, 59, 62, 64], [45, 52, 55, 59, 60], [41, 48, 52, 57, 60], [43, 50, 55, 57, 59]];
const PENTA = [72, 74, 76, 79, 81, 84, 79, 76];

const level = () => {
  const s = getProgress().settings;
  return s.musicOn ? s.music : 0;
};

export function applyMusicSettings() {
  if (master && ctx) master.gain.setTargetAtTime(level() * 0.55, ctx.currentTime, 0.3);
}

function impulse(c: AudioContext) {
  const len = c.sampleRate * 3.2, buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  return buf;
}

function pad(t: number, note: number, dur: number) {
  if (!ctx || !bus) return;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1100;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05, t + 2.6);
  g.gain.setValueAtTime(0.05, t + dur - 0.4);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 3.2);
  f.connect(g); g.connect(bus);
  for (const det of [-5, 4]) {
    const o = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = hz(note); o.detune.value = det;
    o.connect(f); o.start(t); o.stop(t + dur + 3.4);
  }
}

function bell(t: number, note: number, vel: number) {
  if (!ctx || !bus) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.06 * vel, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  g.connect(bus);
  const o = ctx.createOscillator();
  o.type = 'sine'; o.frequency.value = hz(note);
  const o2 = ctx.createOscillator();
  o2.type = 'sine'; o2.frequency.value = hz(note) * 2.01;
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  o2.connect(g2); g2.connect(g);
  o.connect(g);
  o.start(t); o2.start(t); o.stop(t + 3.3); o2.stop(t + 3.3);
}

function schedule() {
  if (!ctx) return;
  const now = ctx.currentTime;
  while (nextChord < now + 6) {
    const ch = CHORDS[chordIdx % CHORDS.length];
    ch.forEach((n, i) => pad(nextChord + i * 0.18, n, 8.2));
    chordIdx++;
    nextChord += 8;
  }
  while (nextNote < now + 4) {
    const n = PENTA[Math.floor(Math.random() * PENTA.length)] - (Math.random() < 0.25 ? 12 : 0);
    bell(nextNote, n, 0.6 + Math.random() * 0.5);
    nextNote += 1.6 + Math.random() * 3.2;
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
    nextChord = nextNote = ctx.currentTime + 0.3;
    schedule();
    timer = window.setInterval(schedule, 700);
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
};

export function stopMusic() {
  clearInterval(timer);
  void ctx?.close();
  ctx = null;
}
