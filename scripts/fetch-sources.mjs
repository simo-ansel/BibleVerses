// Downloads the three public-domain source texts into ./sources (only needed to rebuild the database).
// Usage: node scripts/fetch-sources.mjs   (requires git)
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const out = path.join(root, 'sources');
mkdirSync(out, { recursive: true });

const repos = [
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
];

for (const repo of repos) {
  const dir = mkdtempSync(path.join(tmpdir(), 'bv-src-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'inherit' });
  git('clone', '--depth', '1', '--filter=blob:none', '--sparse', repo.url, 'repo');
  const repoDir = path.join(dir, 'repo');
  execFileSync('git', ['sparse-checkout', 'set', '--no-cone', ...repo.files.map(([p]) => '/' + p)], { cwd: repoDir, stdio: 'inherit' });
  for (const [from, to] of repo.files) {
    copyFileSync(path.join(repoDir, from), path.join(out, to));
    console.log('saved sources/' + to);
  }
  rmSync(dir, { recursive: true, force: true });
}
