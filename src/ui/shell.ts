/** Gemeinsamer Rahmen für Spiele und Aufträge: Auftraggeber links, Sprechblase oben, Mia unten, Tipp-Knopf. */
import { h } from '../core/dom';
import { textOf, type Params } from '../core/texts';
import { equippedFor } from '../core/rewards';
import { miaSvg, npcSvg, type Expr } from './art';
import { speak, say } from '../audio/speak';
import { addCoins } from '../core/rewards';
import { sfx } from '../audio/music';

export interface NpcInfo { id: string; kind: string; name: string }

export interface Shell {
  el: HTMLElement;
  main: HTMLElement;
  /** Aufgabentext (per Text-ID) anzeigen und vorlesen */
  setPrompt(id: string, params?: Params): Promise<void>;
  /** Beliebige Text-ID sprechen (Antwort des Auftraggebers oder Mias) */
  speakId(id: string, params?: Params): Promise<void>;
  sayText(text: string, speaker?: string): Promise<void>;
  face(e: Expr): void;
  feedback(kind: 'good' | 'oops' | 'info', text: string): void;
  setInfo(text: string): void;
  onHint: (() => void) | null;
  pulseHint(on: boolean): void;
  dead: boolean;
  /** Münzen, die in diesem Spiel verdient wurden */
  earned: number;
  /** Münzen für richtige Aufgaben gutschreiben (mit kleiner Anzeige) */
  pay(n: number): void;
}

export function createShell(npc: NpcInfo): Shell {
  const acc = equippedFor('mia');
  const npcArt = h('div', { class: 'gs-npc-art', html: npcSvg(npc.kind, equippedFor(npc.id)) });
  const miaEl = h('div', { class: 'gs-mia', html: miaSvg(acc, 'neutral') });
  const promptText = h('div', { class: 'gs-prompt-text' });
  const info = h('div', { class: 'gs-info' });
  const main = h('div', { class: 'gs-main' });
  let lastPrompt: [string, Params | undefined] | null = null;

  const talking = <T,>(p: Promise<T>) => {
    npcArt.classList.add('talking');
    return p.finally(() => npcArt.classList.remove('talking'));
  };

  const hintBtn = h('button', { class: 'btn sun gs-hint', onclick: () => shell.onHint?.() }, '💡 Tipp');

  const el = h(
    'div',
    { class: 'gshell' },
    h('div', { class: 'gs-side' }, npcArt, h('div', { class: 'gs-name' }, npc.name), hintBtn, miaEl),
    h('div', { class: 'gs-prompt' }, promptText),
    info,
    main
  );

  const shell: Shell = {
    el,
    main,
    dead: false,
    earned: 0,
    pay(n) {
      if (n <= 0) return;
      addCoins(n);
      shell.earned += n;
      sfx.coin();
      const pop = h('div', { class: 'coin-pop' }, `+${n} 🪙`);
      el.append(pop);
      setTimeout(() => pop.remove(), 1500);
    },
    onHint: null,
    async setPrompt(id, params) {
      lastPrompt = [id, params];
      promptText.textContent = textOf(id, params);
      promptText.classList.remove('flip');
      void promptText.offsetWidth;
      promptText.classList.add('flip');
      await talking(speak(id, params));
    },
    speakId(id, params) {
      return talking(speak(id, params));
    },
    sayText(text, speaker = npc.id) {
      return talking(say(text, speaker));
    },
    face(e) {
      miaEl.innerHTML = miaSvg(acc, e);
    },
    feedback(kind, text) {
      el.querySelector('.gs-fb')?.remove();
      const b = h('div', { class: `gs-fb ${kind}` }, text);
      el.append(b);
      setTimeout(() => b.classList.add('out'), 3200);
      setTimeout(() => b.remove(), 3600);
    },
    setInfo(text) {
      info.textContent = text;
    },
    pulseHint(on) {
      hintBtn.classList.toggle('pulse', on);
    },
  };
  return shell;
}
