/** SqlExecutor over Node's built-in SQLite, so the repository is tested against the real database file. */
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SqlExecutor } from '@/infrastructure/sqlite/SqlExecutor';

export const BIBLE_DB_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/db/bible.db');

export function openBibleDatabase(): { db: DatabaseSync; executor: SqlExecutor } {
  const db = new DatabaseSync(BIBLE_DB_PATH, { readOnly: true });
  const executor: SqlExecutor = {
    all: async <T>(sql: string, params: readonly SQLInputValue[] = []) => db.prepare(sql).all(...params) as T[],
    first: async <T>(sql: string, params: readonly SQLInputValue[] = []) =>
      (db.prepare(sql).get(...params) as T) ?? null,
  };
  return { db, executor };
}
