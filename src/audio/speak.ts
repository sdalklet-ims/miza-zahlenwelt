/**
 * Austauschbare Sprachschicht.
 *   speak(textId)  → liest den Text aus den Content-JSONs vor.
 *   1. Gibt es public/audio/<textId>.mp3?  → abspielen (später ergänzbar, ohne Codeänderung)
 *   2. sonst: Web Speech API (speechSynthesis) mit bester deutscher Systemstimme.
 * Untertitel erscheinen immer (abschaltbar in den Einstellungen).
 */
import { entry, fmt, speakerOf, type Params } from '../core/texts';
import { getProgress } from '../core/progress';
import { clamp } from '../core/dom';
import { showSubtitle, hideSubtitle } from '../ui/subtitles';

const synth: SpeechSynthesis | undefined = typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined;
let voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  voices = synth?.getVoices() ?? [];
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

/** Je höher, desto besser: Premium/Enhanced vor Standard, de-DE vor anderen deutschen Varianten. */
export function scoreVoice(v: SpeechSynthesisVoice): number {
  if (!/^de/i.test(v.lang)) return -100;
  const n = v.name.toLowerCase();
  let s = /^de[-_]de/i.test(v.lang) ? 50 : 30;
  if (n.includes('premium')) s += 40;
  if (n.includes('enhanced') || n.includes('erweitert') || n.includes('verbessert')) s += 30;
  if (n.includes('siri')) s += 25;
  if (n.includes('natural') || n.includes('neural')) s += 25;
  if (v.localService) s += 5;
  if (/compact|eddy|flo\b|grandma|grandpa|reed|rocko|sandy|shelley|bubbles|jester|zarvox|whisper/.test(n)) s -= 30;
  return s;
}

export function germanVoices(): SpeechSynthesisVoice[] {
  if (!voices.length) loadVoices();
  return voices.filter((v) => /^de/i.test(v.lang)).sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

export function activeVoice(): SpeechSynthesisVoice | null {
  const uri = getProgress().settings.voiceURI;
  if (uri) {
    const v = voices.find((x) => x.voiceURI === uri);
    if (v) return v;
  }
  return germanVoices()[0] ?? null;
}

const mp3Cache = new Map<string, Promise<string | null>>();
function findMp3(id: string): Promise<string | null> {
  let p = mp3Cache.get(id);
  if (!p) {
    const url = `${import.meta.env.BASE_URL}audio/${id}.mp3`;
    p = fetch(url, { method: 'HEAD' })
      .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('audio') ? url : null))
      .catch(() => null);
    mp3Cache.set(id, p);
  }
  return p;
}

let seq = 0;
let cancelCurrent: (() => void) | null = null;
let keepAlive: SpeechSynthesisUtterance | null = null; // verhindert vorzeitiges Aufräumen in manchen Browsern

async function run(text: string, speakerId: string, mp3Id?: string): Promise<void> {
  const my = ++seq;
  cancelCurrent?.();
  showSubtitle(text, speakerId);
  const st = getProgress().settings;
  const sp = speakerOf(speakerId);
  const est = Math.max(1500, (text.length * (st.muted ? 60 : 80)) / st.rate + 600);

  await new Promise<void>((resolve) => {
    let finished = false;
    const timers: number[] = [];
    let audio: HTMLAudioElement | null = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      if (cancelCurrent === cancel) cancelCurrent = null;
      resolve();
    };
    const cancel = () => {
      synth?.cancel();
      audio?.pause();
      finish();
    };
    cancelCurrent = cancel;

    if (st.muted) {
      timers.push(window.setTimeout(finish, est));
      return;
    }
    timers.push(window.setTimeout(finish, est + 4000)); // Sicherheitsnetz, falls onend nie kommt

    const useSystemVoice = () => {
      if (finished) return;
      if (!synth) return void timers.push(window.setTimeout(finish, est));
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = activeVoice();
      u.lang = v?.lang ?? 'de-DE';
      if (v) u.voice = v;
      u.rate = clamp(st.rate * sp.rate, 0.3, 1.6);
      u.pitch = clamp(sp.pitch, 0.1, 2);
      u.onend = finish;
      u.onerror = finish;
      keepAlive = u;
      synth.speak(u);
    };

    if (!mp3Id) return useSystemVoice();
    findMp3(mp3Id).then((url) => {
      if (finished) return;
      if (!url) return useSystemVoice();
      audio = new Audio(url);
      audio.onended = finish;
      audio.onerror = useSystemVoice;
      audio.play().catch(useSystemVoice);
    });
  });

  if (my === seq) hideSubtitle(1800);
}

/** Spricht den Text mit dieser ID (aus content/*.json). Mit Platzhaltern {name} → params. */
export function speak(textId: string, params?: Params): Promise<void> {
  const e = entry(textId);
  if (!e) {
    console.warn('speak: Text-ID fehlt', textId);
    return Promise.resolve();
  }
  return run(fmt(e[1], params), e[0], params ? undefined : textId);
}

/** Spricht freien Text (z. B. dynamisch erzeugte Hinweise). */
export function say(text: string, speakerId = 'mia'): Promise<void> {
  return run(text, speakerId);
}

export function stopSpeaking() {
  seq++;
  cancelCurrent?.();
  hideSubtitle(0);
}

/** Muss in einer Berührung aufgerufen werden (iPad-Safari erlaubt Sprache erst danach). */
export function unlockAudio() {
  try {
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  } catch {
    /* egal */
  }
}
