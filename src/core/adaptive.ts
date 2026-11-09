/**
 * Adaptive Schwierigkeit:
 *  - 3 richtige in Folge  → Stufe hoch
 *  - 2 Fehler in Folge    → Stufe runter + Hinweis anbieten
 */
export type LevelChange = 'up' | 'down' | 'hint' | null;

export class Adaptive {
  right = 0;
  wrong = 0;
  constructor(public level = 1, public readonly min = 1, public readonly max = 5) {
    this.level = Math.max(min, Math.min(max, level));
  }

  /** Meldet das Ergebnis; liefert zurück, ob sich die Stufe ändert ('hint' = schon auf der leichtesten Stufe). */
  record(correct: boolean): LevelChange {
    if (correct) {
      this.right++;
      this.wrong = 0;
      if (this.right >= 3) {
        this.right = 0;
        if (this.level < this.max) {
          this.level++;
          return 'up';
        }
      }
      return null;
    }
    this.wrong++;
    this.right = 0;
    if (this.wrong >= 2) {
      this.wrong = 0;
      if (this.level > this.min) {
        this.level--;
        return 'down';
      }
      return 'hint';
    }
    return null;
  }
}
