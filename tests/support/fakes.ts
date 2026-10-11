/** In-memory test doubles for the ports. */
import type { Clipboard, Feedback, KeyValueStore, ReminderScheduler, VerseCard, VerseCardSharer } from '@/core/ports';
import type { ReminderTime } from '@/core/settings';

export class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  get(key: string) {
    return this.data.get(key) ?? null;
  }
  set(key: string, value: string) {
    this.data.set(key, value);
  }
}

export class FakeReminders implements ReminderScheduler {
  permission: 'granted' | 'denied' = 'granted';
  scheduled: ReminderTime | null = null;
  private listener: (() => void) | null = null;

  async requestPermission() {
    return this.permission === 'granted';
  }
  async hasPermission() {
    return this.permission === 'granted';
  }
  async scheduleDaily(time: ReminderTime) {
    this.scheduled = time;
  }
  async cancel() {
    this.scheduled = null;
  }
  onOpened(listener: () => void) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }
  tap() {
    this.listener?.();
  }
}

export class FakeSharer implements VerseCardSharer {
  readonly shared: VerseCard[] = [];
  async share(card: VerseCard) {
    this.shared.push(card);
  }
}

export class FakeClipboard implements Clipboard {
  text = '';
  async copy(text: string) {
    this.text = text;
  }
}

export class FakeFeedback implements Feedback {
  events: string[] = [];
  selection() {
    this.events.push('selection');
  }
  success() {
    this.events.push('success');
  }
}
