# Einmaliges Hilfsskript: Spiele melden fehlerfreie Durchläufe; HUD-Knopf für das Abzeichenbuch
def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:80])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)


NOTE = "  const note = await badgeRun(KEY, CLEAN);\n  if (shell.dead) return;\n"

# ── Wald: Punkte, Kärtchen (finishRound) ──
ed('src/stations/wald/games.ts', [
    ("import { award, showResult } from '../../ui/results';", "import { award, showResult } from '../../ui/results';\nimport { badgeRun } from '../../ui/badges';"),
    ("  await award(key, stars);\n  if (shell.dead) return;\n  shell.pulseHint(false);", "  await award(key, stars);\n  if (shell.dead) return;\n" + NOTE.replace('KEY', 'key').replace('CLEAN', 'hits === total') + "  shell.pulseHint(false);"),
    ("Verdient: ${shell.earned} 🪙`,", "Verdient: ${shell.earned} 🪙${note ? '  ' + note : ''}`,"),
    # Steine-Meister: Serie von 5 neuen Zahlen ohne Wiederholung = fehlerfreier Durchlauf
    ("  let busy = false;\n  const okBtn = h('button', { class: 'btn', disabled: true, onclick: submit }, '✓ Das ist meine Zahl!');", "  let busy = false;\n  let streak = 0; // neue Zahlen in Folge ohne Wiederholung (5 = ein fehlerfreier Durchlauf)\n  const SERIES = 5;\n  const okBtn = h('button', { class: 'btn', disabled: true, onclick: submit }, '✓ Das ist meine Zahl!');"),
    ("  shell.setInfo(`Genau ${STONES} Steine!`);", "  const info = () => shell.setInfo(`Genau ${STONES} Steine! · Serie ohne Wiederholung: ${streak}/${SERIES}`);\n  info();"),
    ("      shell.feedback('info', `${n} hattest du schon.`);", "      streak = 0;\n      info();\n      shell.feedback('info', `${n} hattest du schon.`);"),
    ("      chips.get(n)?.classList.add('new');", "      chips.get(n)?.classList.add('new');\n      streak++;\n      info();"),
    ("      await shell.speakId('wald.steine.new', { n });", "      await shell.speakId('wald.steine.new', { n });\n      if (streak >= SERIES) { streak = 0; info(); await badgeRun('wald.steine', true); if (shell.dead) return; }"),
])
# ── Wald: Pilze und Angeln (minigames.finish) ──
ed('src/stations/wald/minigames.ts', [
    ("import { award, showResult } from '../../ui/results';", "import { award, showResult } from '../../ui/results';\nimport { badgeRun } from '../../ui/badges';"),
    ("done: () => void, again: () => void) {\n  shell.pay(stars * 5);\n  await award(key, stars);\n  if (shell.dead) return;", "done: () => void, again: () => void, clean = false) {\n  shell.pay(stars * 5);\n  await award(key, stars);\n  if (shell.dead) return;\n" + NOTE.replace('KEY', 'key').replace('CLEAN', 'clean')),
    ("Verdient: ${shell.earned} 🪙`, stars,", "Verdient: ${shell.earned} 🪙${note ? '  ' + note : ''}`, stars,") if False else ("title: 'Geschafft!', stars, text: `${text}  Verdient: ${shell.earned} 🪙`,", "title: 'Geschafft!', stars, text: `${text}  Verdient: ${shell.earned} 🪙${note ? '  ' + note : ''}`,"),
    (": `${wrong} Mal vertippt – aber du hast es geschafft.`, done, again);", ": `${wrong} Mal vertippt – aber du hast es geschafft.`, done, again, wrong === 0);"),
])
ed('src/stations/wald/angeln.ts', [(": `${wrong} Mal daneben gegriffen – aber alle gefangen.`, done, again);", ": `${wrong} Mal daneben gegriffen – aber alle gefangen.`, done, again, wrong === 0);")])
# ── Wiese/Fluss: common.finish ──
ed('src/stations/wiese/common.ts', [
    ("import { award, showResult } from '../../ui/results';", "import { award, showResult } from '../../ui/results';\nimport { badgeRun } from '../../ui/badges';"),
    ("bonus = 3, backLabel = 'Zurück auf die Wiese') {\n  shell.pay(stars * bonus);\n  await award(key, stars);\n  if (shell.dead) return;", "bonus = 3, backLabel = 'Zurück auf die Wiese', clean = false) {\n  shell.pay(stars * bonus);\n  await award(key, stars);\n  if (shell.dead) return;\n" + NOTE.replace('KEY', 'key').replace('CLEAN', 'clean')),
    ("text: `${text}  Verdient: ${shell.earned} 🪙`,", "text: `${text}  Verdient: ${shell.earned} 🪙${note ? '  ' + note : ''}`,"),
])
ed('src/stations/wiese/games.ts', [
    ("`${hits} von ${ROUNDS} gleich beim ersten Versuch richtig.`, done, again);", "`${hits} von ${ROUNDS} gleich beim ersten Versuch richtig.`, done, again, 3, 'Zurück auf die Wiese', hits === ROUNDS);"),
    ("import { finish, playRounds, screenOf, starsFor } from './common';", "import { finish, playRounds, screenOf, starsFor } from './common';\nimport { badgeRun } from '../../ui/badges';"),
    ("    await award('wiese.check', stars);\n    if (shell.dead) return;", "    await award('wiese.check', stars);\n    if (shell.dead) return;\n    const note = await badgeRun('wiese.check', hits === tasks.length);\n    if (shell.dead) return;"),
    ("Verdient: ${shell.earned} 🪙`,\n      buttons:", "Verdient: ${shell.earned} 🪙${note ? '  ' + note : ''}`,\n      buttons:"),
])
ed('src/stations/wiese/partner.ts', [("done, again, 4);", "done, again, 4, 'Zurück auf die Wiese', wrong === 0);")])
ed('src/stations/wiese/strahl.ts', [("`${hits} von ${TOTAL} gleich beim ersten Versuch richtig.`, done, again);", "`${hits} von ${TOTAL} gleich beim ersten Versuch richtig.`, done, again, 3, 'Zurück auf die Wiese', hits === TOTAL);")])
ed('src/stations/fluss/games.ts', [
    ("done, again, 3, 'Zurück zum Fluss');", "done, again, 3, 'Zurück zum Fluss', hits === ROUNDS);"),
    ("import { finish, playRounds, screenOf, starsFor } from '../wiese/common';", "import { finish, playRounds, screenOf, starsFor } from '../wiese/common';\nimport { badgeRun } from '../../ui/badges';"),
    ("    await award('fluss.check', stars);\n    if (shell.dead) return;", "    await award('fluss.check', stars);\n    if (shell.dead) return;\n    const note = await badgeRun('fluss.check', hits === tasks.length);\n    if (shell.dead) return;"),
    ("Verdient: ${shell.earned} 🪙`,\n      buttons:", "Verdient: ${shell.earned} 🪙${note ? '  ' + note : ''}`,\n      buttons:"),
])
ed('src/stations/fluss/paare.ts', [("done, again, 4, 'Zurück zum Fluss');", "done, again, 4, 'Zurück zum Fluss', wrong === 0);")])
ed('src/stations/fluss/reihe.ts', [("done, again, 4, 'Zurück zum Fluss');", "done, again, 4, 'Zurück zum Fluss', wrong === 0);")])
# ── HUD ──
ed('src/ui/hud.ts', [
    ("  onRide?: () => void;\n}", "  onRide?: () => void;\n  onBadges?: () => void;\n}"),
    ("import { chargeOf,", "import { badgeChipText } from './badges';\nimport { chargeOf,"),
    ("let batEl: HTMLElement;", "let batEl: HTMLElement;\nlet badgeEl: HTMLElement;"),
    ("    batFill = h('i', {});", "    badgeEl = h('button', { class: 'hud-stars badges', 'aria-label': 'Abzeichenbuch', onclick: () => handlers.onBadges?.() });\n    batFill = h('i', {});"),
    ("      starsEl,\n", "      starsEl,\n      badgeEl,\n"),
    ("    set(starsEl,", "    if (badgeEl) set(badgeEl, badgeChipText());\n    set(starsEl,")])
ed('src/main.ts', [("onRide: openGarage }", "onRide: openGarage, onBadges: () => openBadgeBook() }"), ("import { openGarage } from './ui/carshop';", "import { openGarage } from './ui/carshop';\nimport { openBadgeBook } from './ui/badges';")])
print('ok')
