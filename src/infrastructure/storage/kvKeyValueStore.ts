import Storage from 'expo-sqlite/kv-store';

import type { KeyValueStore } from '@/core/ports';

/** KeyValueStore on expo-sqlite's key-value store (a separate database from the Bible text). */
export function createKvKeyValueStore(): KeyValueStore {
  return {
    get(key) {
      try {
        return Storage.getItemSync(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        Storage.setItemSync(key, value);
      } catch {
        // Storage is best effort: the in-memory state stays correct for this session.
      }
    },
  };
}
