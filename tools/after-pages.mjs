// Nach dem Build nach docs/: .nojekyll anlegen (GitHub Pages soll nichts umbauen)
import { writeFileSync } from 'node:fs';

writeFileSync('docs/.nojekyll', '');
console.log('docs/ ist fertig für GitHub Pages');
