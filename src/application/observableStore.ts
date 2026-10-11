import type { KeyValueStore, Unsubscribe } from '@/core/ports';

/** A value that can be read synchronously and observed (fits React's useSyncExternalStore). */
export interface Observable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): Unsubscribe;
}

/** An observable value persisted as JSON under one key. */
export class PersistedStore<T> implements Observable<T> {
  private value: T;
  private readonly listeners = new Set<() => void>();
  private readonly storage: KeyValueStore;
  private readonly key: string;

  constructor(storage: KeyValueStore, key: string, parse: (raw: unknown) => T) {
    this.storage = storage;
    this.key = key;
    this.value = parse(readJson(storage, key));
  }

  getSnapshot = (): T => this.value;

  subscribe = (listener: () => void): Unsubscribe => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  protected set(next: T): void {
    this.value = next;
    this.storage.set(this.key, JSON.stringify(next));
    this.listeners.forEach((listener) => listener());
  }
}

function readJson(storage: KeyValueStore, key: string): unknown {
  const raw = storage.get(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
