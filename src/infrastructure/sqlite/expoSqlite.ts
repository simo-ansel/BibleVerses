/** expo-sqlite adapters: the only module that talks to the expo-sqlite database API. */
import { deleteDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DATA_VERSION } from '@/core/bible/catalog';

import type { SqlExecutor, SqlParam } from './SqlExecutor';

/**
 * Local file name of the Bible database. It carries the data version, so an app update
 * that ships new text copies a fresh database instead of keeping the old copy.
 */
export const BIBLE_DATABASE_NAME = `bible-v${DATA_VERSION}.db`;

export function createSqlExecutor(db: SQLiteDatabase): SqlExecutor {
  return {
    all: <T>(sql: string, params: readonly SqlParam[] = []) => db.getAllAsync<T>(sql, [...params]),
    first: <T>(sql: string, params: readonly SqlParam[] = []) => db.getFirstAsync<T>(sql, [...params]),
  };
}

/** Deletes copies of the database left behind by earlier app versions. */
export async function removeOutdatedBibleDatabases(): Promise<void> {
  for (let version = 1; version < DATA_VERSION; version++) {
    try {
      await deleteDatabaseAsync(`bible-v${version}.db`);
    } catch {
      // Not present: nothing to clean up.
    }
  }
}
