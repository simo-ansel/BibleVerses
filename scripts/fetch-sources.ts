/**
 * Downloads the public-domain source texts into ./sources (only needed to rebuild the database).
 * Usage: npm run data:fetch   (requires git)
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'sources');

const REPOSITORIES = [
  {
    url: 'https://github.com/scrollmapper/bible_databases',
    files: [['formats/json/KJVA.json', 'KJVA.json']],
  },
  {
    url: 'https://github.com/scrollmapper/bible_databases_deuterocanonical',
    files: [
      ['sources/en/1-enoch/1-enoch.json', '1-enoch.json'],
      ['sources/en/book-of-jubilees/book-of-jubilees.json', 'book-of-jubilees.json'],
    ],
  },
] as const;

mkdirSync(OUT, { recursive: true });
for (const repository of REPOSITORIES) {
  const workDir = mkdtempSync(path.join(tmpdir(), 'bibleverses-sources-'));
  const clone = path.join(workDir, 'repo');
  try {
    execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', repository.url, clone], {
      stdio: 'inherit',
    });
    const paths = repository.files.map(([from]) => `/${from}`);
    execFileSync('git', ['sparse-checkout', 'set', '--no-cone', ...paths], { cwd: clone, stdio: 'inherit' });
    for (const [from, to] of repository.files) {
      copyFileSync(path.join(clone, from), path.join(OUT, to));
      console.log(`saved sources/${to}`);
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}
