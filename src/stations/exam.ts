/**
 * Mathearbeit bei Eule Olga am Nebeltor: fünf Aufgaben, je eine aus jedem Spiel der Welt.
 * Mit mindestens 4 von 5 Punkten (Punkt = beim ersten Versuch richtig) ist sie bestanden: das Meister-Abzeichen gehört Mia,
 * die nächste Welt wird frei und der Nebel löst sich auf. Sonst gibt es freundlichen Zuspruch und beliebig viele neue Versuche.
 */
import { pick, rnd, wait } from '../core/dom';
import { getProgress } from '../core/progress';
import { getWorld, worlds } from '../core/texts';
import { createShell, type Shell } from '../ui/shell';
import { award, showResult } from '../ui/results';
import { celebrateBadge } from '../ui/badges';
import { show, type Screen } from '../core/router';
import { EXAM_PASS, examPassed, masterBadge, recordExam } from '../core/badges';
import { setWorldUnlocked } from '../core/unlock';
import { runBuild, runCards, runCount, type TaskResult } from './wald/tasks';
import { genCards, NumberGen, numOf, type CardRule, type PunkteRule } from './wald/generators';
import { runFishTask } from './wald/angeln';
import { runPilzeTask } from './wald/minigames';
import { genCalc, runCalc, runErgaenzen } from './wiese/calc';
import { runStrahl } from './wiese/strahl';
import { genMul, runMul } from './fluss/mal';
import { runChoice, runSeq } from './fluss/tasks';

type Task = (shell: Shell) => Promise<TaskResult>;
const lv = (key: string, min = 2) => Math.max(min, Math.min(5, getProgress().levels[key] ?? 1));

/** Je Welt fünf Aufgaben in der Reihenfolge der Abzeichen */
function tasksOf(world: string): Task[] {
  if (world === 'wald') {
    const w = getWorld('wald')!;
    const gen = new NumberGen(w.games.punkte.levels as PunkteRule[]);
    const rules = w.games.kaertchen.levels as CardRule[];
    return [
      (s) => runCount(s, gen.next(lv('wald.punkte'))),
      (s) => runBuild(s, numOf(rnd(1, 8), rnd(0, 9), rnd(1, 9))),
      (s) => { const mode = Math.random() < 0.5 ? 'max' : 'min'; return runCards(s, genCards(rules[Math.min(rules.length, lv('wald.kaertchen')) - 1], mode), mode); },
      (s) => runFishTask(s, lv('wald.punkte')),
      (s) => runPilzeTask(s),
    ];
  }
  if (world === 'wiese') {
    return [
      (s) => runCalc(s, genCalc('+', lv('wiese.plus'))),
      (s) => runCalc(s, genCalc('-', lv('wiese.minus'))),
      (s) => { const t = Math.random() < 0.5 ? 100 : 1000; return runErgaenzen(s, t === 100 ? rnd(11, 89) : rnd(1, 9) * 100 + rnd(1, 9) * 10, t); },
      (s) => runStrahl(s, lv('wiese.strahl'), pick(['find', 'read'] as const)),
      (s) => runCalc(s, genCalc(pick(['+', '-'] as const), Math.min(5, lv('wiese.plus') + 1))),
    ];
  }
  return [
    (s) => runMul(s, genMul('×', lv('fluss.mal')), lv('fluss.mal') + 2),
    (s) => runMul(s, genMul(':', lv('fluss.teilen')), lv('fluss.teilen') + 2),
    (s) => runSeq(s, lv('fluss.reihe')),
    (s) => runChoice(s, lv('fluss.paare')),
    (s) => runMul(s, genMul(pick(['×', ':'] as const), Math.min(5, lv('fluss.mal') + 1)), 5),
  ];
}

export function examScreen(worldId: string, done: () => void): Screen {
  const shell = createShell({ id: 'eule', kind: 'owl', name: 'Eule Olga' });
  const tasks = tasksOf(worldId);
  const idx = worlds.findIndex((w) => w.id === worldId);
  const next = worlds[idx + 1];
  (async () => {
    await shell.speakId('exam.intro');
    let score = 0;
    const marks = tasks.map(() => '○');
    for (let i = 0; i < tasks.length && !shell.dead; i++) {
      shell.setInfo(`Mathearbeit · Aufgabe ${i + 1} von ${tasks.length}   ${marks.join(' ')}`);
      // Nur Entwicklung: window.__examAuto = 4 → die ersten 4 Aufgaben gelten als richtig (zum Testen des Bestehens)
      const auto = import.meta.env.DEV ? (window as unknown as { __examAuto?: number }).__examAuto : undefined;
      const res = auto !== undefined ? { firstTry: i < auto, attempts: 1 } : await tasks[i](shell);
      if (shell.dead) return;
      marks[i] = res.firstTry ? '●' : '✕';
      if (res.firstTry) score++;
      await wait(450);
    }
    if (shell.dead) return;
    shell.setInfo(`Mathearbeit · ${marks.join(' ')}   ${score} von ${tasks.length} Punkten`);
    if (score >= EXAM_PASS) {
      const first = !examPassed(worldId);
      recordExam(worldId, score);
      if (next) setWorldUnlocked(next.id, true);
      const stars = score === tasks.length ? 3 : 2;
      shell.pay(score * 5);
      await award(`${worldId}.pruefung`, stars);
      const m = masterBadge(worldId);
      if (first && m) await celebrateBadge(m);
      if (shell.dead) return;
      showResult({
        title: 'Mathearbeit bestanden!', stars, speakId: `exam.pass.${score}`,
        text: `${score} von ${tasks.length} Punkten. Verdient: ${shell.earned} 🪙` + (next && next.meta.status === 'open' ? ` Der Nebel lichtet sich – ${next.meta.title} wartet!` : ' Hinter dem Nebel wächst noch alles heran.'),
        buttons: [{ label: 'Weiter', cls: 'sun', onClick: done }],
      });
    } else {
      showResult({
        title: 'Fast geschafft!', stars: 0, speakId: 'exam.fail',
        text: `${score} von ${tasks.length} Punkten. Mit ${EXAM_PASS} bestehst du. Ein Fehler ist erlaubt, probier es gleich nochmal!`,
        buttons: [{ label: '🔁 Nochmal versuchen', cls: 'sun', onClick: () => show(examScreen(worldId, done), { back: done }) }, { label: 'Zurück zu den Spielen', onClick: done }],
      });
    }
  })();
  return { el: shell.el, dispose: () => void (shell.dead = true) };
}
