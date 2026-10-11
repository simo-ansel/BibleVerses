/**
 * Composition root: the one place that chooses concrete adapters for the ports and wires them
 * into the application services. To replace a library, change the adapter created here.
 */
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, type ReactNode } from 'react';

import { createAppServices } from '@/application/AppServices';
import { createExpoClipboard, createHapticFeedback } from '@/infrastructure/device/expoDevice';
import { createExpoReminderScheduler } from '@/infrastructure/notifications/expoReminderScheduler';
import { createSkiaVerseCardSharer } from '@/infrastructure/sharing/skiaVerseCardSharer';
import {
  BIBLE_DATABASE_NAME,
  createSqlExecutor,
  removeOutdatedBibleDatabases,
} from '@/infrastructure/sqlite/expoSqlite';
import { SqlBibleRepository } from '@/infrastructure/sqlite/SqlBibleRepository';
import { createKvKeyValueStore } from '@/infrastructure/storage/kvKeyValueStore';
import { AppServicesContext } from '@/ui/services';
import { CARD_FONT_FILES } from '@/ui/theme';

// Metro bundles the database file as an asset (see metro.config.js).
const BIBLE_DATABASE_ASSET = require('../../assets/db/bible.db');

export function ServicesProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={BIBLE_DATABASE_NAME} assetSource={{ assetId: BIBLE_DATABASE_ASSET }}>
      <Services>{children}</Services>
    </SQLiteProvider>
  );
}

function Services({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const services = useMemo(
    () =>
      createAppServices({
        bible: new SqlBibleRepository(createSqlExecutor(db)),
        storage: createKvKeyValueStore(),
        reminders: createExpoReminderScheduler(),
        sharer: createSkiaVerseCardSharer(CARD_FONT_FILES),
        clipboard: createExpoClipboard(),
        feedback: createHapticFeedback(),
      }),
    [db],
  );

  useEffect(() => {
    void services.settings.syncReminder().catch(() => undefined);
    void removeOutdatedBibleDatabases();
  }, [services]);

  return <AppServicesContext.Provider value={services}>{children}</AppServicesContext.Provider>;
}
