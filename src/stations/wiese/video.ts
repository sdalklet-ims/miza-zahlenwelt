/** Biene Bella erklärt den Rechenstrich: Plus mit Hundertern, Zehnern, Einern – Minus rückwärts – Zehner voll machen. */
import { h, wait } from '../../core/dom';
import { createShell } from '../../ui/shell';
import { createStrich, type Strich } from '../../ui/strich';
import { award, showResult } from '../../ui/results';
import type { Screen } from '../../core/router';

type Cmd = { start: number } | { hop: number } | { mark: number } | { wait: number };
interface Step { text: string; do: Cmd[]; lo: number; hi: number }

const STEPS: Step[] = [
  { text: 'wiese.video.01', do: [], lo: 300, hi: 640 },
  { text: 'wiese.video.02', do: [{ start: 340 }], lo: 300, hi: 640 },
  { text: 'wiese.video.03', do: [{ wait: 400 }], lo: 300, hi: 640 },
  { text: 'wiese.video.04', do: [{ hop: 200 }], lo: 300, hi: 640 },
  { text: 'wiese.video.05', do: [{ hop: 50 }], lo: 300, hi: 640 },
  { text: 'wiese.video.06', do: [{ hop: 3 }, { mark: 593 }], lo: 300, hi: 640 },
  { text: 'wiese.video.07', do: [{ start: 470 }], lo: 300, hi: 500 },
  { text: 'wiese.video.08', do: [{ hop: -100 }, { hop: -30 }, { mark: 340 }], lo: 300, hi: 500 },
  { text: 'wiese.video.09', do: [{ start: 358 }], lo: 340, hi: 380 },
  { text: 'wiese.video.10', do: [{ hop: 2 }, { hop: 5 }, { mark: 365 }], lo: 340, hi: 380 },
  { text: 'wiese.video.11', do: [], lo: 340, hi: 380 },
];

export function videoScreen(done: () => void, again: () => void): Screen {
  const shell = createShell({ id: 'bella', kind: 'bee', name: 'Biene Bella' });
  const box = h('div', { class: 'video-strich' });
  shell.main.append(h('div', { class: 'task video-w' }, box));
  shell.setInfo('Bella erklärt den Rechenstrich');
  shell.onHint = () => void 0;
  (async () => {
    let strich: Strich | null = null;
    let range = '';
    for (const st of STEPS) {
      if (shell.dead) return;
      const rk = `${st.lo}-${st.hi}`;
      if (rk !== range) { range = rk; strich = createStrich(st.lo, st.hi); box.replaceChildren(strich.el); }
      const talk = shell.setPrompt(st.text);
      for (const c of st.do) {
        if (shell.dead) return;
        if ('start' in c) strich!.start(c.start);
        else if ('hop' in c) await strich!.hop(c.hop, c.hop > 0 ? `+${c.hop}` : `${c.hop}`);
        else if ('mark' in c) strich!.mark(c.mark, String(c.mark));
        else await wait(c.wait);
      }
      await talk;
      await wait(400);
    }
    if (shell.dead) return;
    shell.pay(2);
    await award('wiese.video', 1);
    if (shell.dead) return;
    showResult({
      title: 'Rechenstrich gelernt!', stars: 1, speakId: 'wiese.video.done', text: 'Jetzt kannst du bei Bella, Schorsch und Hannes üben.',
      buttons: [{ label: '🔁 Nochmal ansehen', cls: 'sun', onClick: again }, { label: 'Zurück auf die Wiese', onClick: done }],
    });
  })();
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}
