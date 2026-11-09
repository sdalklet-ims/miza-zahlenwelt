/** Biber Bruno erklärt Malnehmen (gleich große Gruppen), Tauschaufgaben, Teilen als Umkehrung und einen Verdopplungs-Trick. */
import { h, wait } from '../../core/dom';
import { createShell } from '../../ui/shell';
import { createStrich, type Strich } from '../../ui/strich';
import { dotsEl } from '../../ui/dots';
import { award, showResult } from '../../ui/results';
import type { Screen } from '../../core/router';

type Cmd = { dots: [number, number, boolean?] } | { strich: [number, number] } | { start: number } | { hop: number } | { mark: number; label?: string } | { wait: number };
interface Step { text: string; do: Cmd[] }

const STEPS: Step[] = [
  { text: 'fluss.video.01', do: [] },
  { text: 'fluss.video.02', do: [{ dots: [3, 4] }] },
  { text: 'fluss.video.03', do: [{ strich: [0, 16] }, { start: 0 }, { hop: 4 }, { hop: 4 }, { hop: 4 }, { mark: 12 }] },
  { text: 'fluss.video.04', do: [{ dots: [4, 3] }] },
  { text: 'fluss.video.05', do: [{ strich: [0, 16] }, { start: 0 }, { hop: 3 }, { hop: 3 }, { hop: 3 }, { hop: 3 }, { mark: 12 }] },
  { text: 'fluss.video.06', do: [{ dots: [3, 4, true] }] },
  { text: 'fluss.video.07', do: [{ strich: [0, 16] }, { start: 0 }, { hop: 4 }, { hop: 4 }, { hop: 4 }, { mark: 12, label: '3 Sprünge' }] },
  { text: 'fluss.video.08', do: [{ strich: [0, 30] }, { start: 0 }, { hop: 12 }, { hop: 12 }, { mark: 24 }] },
  { text: 'fluss.video.09', do: [] },
];

export function videoScreen(done: () => void, again: () => void): Screen {
  const shell = createShell({ id: 'bruno', kind: 'beaver', name: 'Biber Bruno' });
  const pic = h('div', { class: 'dots-box on video-dots' });
  const strichBox = h('div', { class: 'video-strich' });
  shell.main.append(h('div', { class: 'task video-w' }, pic, strichBox));
  shell.setInfo('Bruno erklärt das Malnehmen');
  shell.onHint = () => void 0;
  (async () => {
    let strich: Strich | null = null;
    for (const st of STEPS) {
      if (shell.dead) return;
      const talk = shell.setPrompt(st.text);
      for (const c of st.do) {
        if (shell.dead) return;
        if ('dots' in c) { pic.replaceChildren(dotsEl(c.dots[0], c.dots[1], !!c.dots[2])); strichBox.replaceChildren(); strich = null; }
        else if ('strich' in c) { strich = createStrich(c.strich[0], c.strich[1]); strichBox.replaceChildren(strich.el); }
        else if ('start' in c) strich!.start(c.start);
        else if ('hop' in c) await strich!.hop(c.hop, `+${c.hop}`);
        else if ('mark' in c) strich!.mark(c.mark, c.label ?? String(c.mark));
        else await wait(c.wait);
      }
      await talk;
      await wait(500);
    }
    if (shell.dead) return;
    shell.pay(2);
    await award('fluss.video', 1);
    if (shell.dead) return;
    showResult({
      title: 'Malnehmen verstanden!', stars: 1, speakId: 'fluss.video.done', text: 'Jetzt kannst du bei Fred, Emma und Otto üben.',
      buttons: [{ label: '🔁 Nochmal ansehen', cls: 'sun', onClick: again }, { label: 'Zurück zum Fluss', onClick: done }],
    });
  })();
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}
