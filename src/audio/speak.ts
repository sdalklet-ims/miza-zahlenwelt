/**
 * Texte werden nur gelesen, nicht gesprochen (keine Stimmen im Spiel).
 *   speak(textId) / say(text) zeigen den Text als Untertitel und warten eine angemessene Lesezeit,
 *   damit Abläufe (Erklärvideo, Hinweise) im Lesetempo eines Kindes weiterlaufen.
 * Die Namen und IDs bleiben, damit später wieder Sprache (z. B. MP3) ergänzt werden könnte.
 */
import { entry, fmt, type Params } from '../core/texts';
import { showSubtitle, hideSubtitle } from '../ui/subtitles';
import { startMusic } from './music';

let seq = 0;
let cancelCurrent: (() => void) | null = null;

async function run(text: string, speakerId: string): Promise<void> {
  const my = ++seq;
  cancelCurrent?.();
  showSubtitle(text, speakerId);
  const ms = Math.max(2400, text.length * 58 + 1000);
  await new Promise<void>((resolve) => {
    const t = window.setTimeout(resolve, ms);
    cancelCurrent = () => {
      clearTimeout(t);
      resolve();
    };
  });
  if (my === seq) hideSubtitle(1200);
}

/** Zeigt den Text mit dieser ID (aus content/*.json) als Untertitel. Platzhalter {name} → params. */
export function speak(textId: string, params?: Params): Promise<void> {
  const e = entry(textId);
  if (!e) {
    console.warn('speak: Text-ID fehlt', textId);
    return Promise.resolve();
  }
  return run(fmt(e[1], params), e[0]);
}

/** Zeigt freien Text (z. B. dynamisch erzeugte Hinweise). */
export function say(text: string, speakerId = 'mia'): Promise<void> {
  return run(text, speakerId);
}

export function stopSpeaking() {
  seq++;
  cancelCurrent?.();
  hideSubtitle(0);
}

/** Muss in einer Berührung aufgerufen werden (iPad): startet die Musik. */
export function unlockAudio() {
  startMusic();
}
