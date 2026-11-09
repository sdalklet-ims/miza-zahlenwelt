# Einmaliges Hilfsskript: fröhliche Standardmusik mit entspanntem Beat (Kick, Shaker, Clap, Bass, Marimba).
p = 'src/audio/music.ts'
s = open(p, encoding='utf-8').read()

s = s.replace("voice: 'bell' | 'pluck' | 'marimba'; padVol: number; noteVol: number; bass?: boolean;\n}",
              "voice: 'bell' | 'pluck' | 'marimba'; padVol: number; noteVol: number; bass?: boolean;\n  /** Mit Rhythmusgruppe: Schläge pro Minute (sonst freie Flächen-Musik) */\n  bpm?: number; swing?: number;\n}")

a = s.index("  { id: 'wald',")
b = s.index("  { id: 'sonne',")
s = s[:a] + "  { id: 'wald', name: 'Fröhlicher Wald', icon: '🌲', chords: [[48, 52, 55, 59], [43, 50, 55, 59], [45, 52, 55, 60], [41, 48, 53, 57]], chordLen: 5, melody: [72, 74, 76, 79, 81, 84, 79, 76], gap: [0.3, 0.8], voice: 'marimba', padVol: 0.03, noteVol: 0.085, bpm: 94, swing: 0.02 },\n" + s[b:]

s = s.replace("let station: Station = STATIONS[0];", "let station: Station = STATIONS[0];\nlet nextStep = 0;\nlet stepIdx = 0;\nlet noiseBuf: AudioBuffer | null = null;")
s = s.replace("    nextChord = nextNote = ctx.currentTime + 0.25;\n    chordIdx = noteIdx = 0;", "    nextChord = nextNote = nextStep = ctx.currentTime + 0.25;\n    chordIdx = noteIdx = stepIdx = 0;")
s = s.replace("    nextChord = nextNote = ctx.currentTime + 0.3;\n    schedule();", "    nextChord = nextNote = nextStep = ctx.currentTime + 0.3;\n    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);\n    { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }\n    schedule();")

BEAT = r"""
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
"""
s = s.replace("\nfunction schedule() {\n  if (!ctx) return;\n", BEAT, 1)
s = s.replace("timer = window.setInterval(schedule, 600);", "timer = window.setInterval(schedule, 500);")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
