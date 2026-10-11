import type { KeyValueStore, ReminderScheduler } from '@/core/ports';
import { parseSettings, type ReminderTime, type Settings } from '@/core/settings';

import { PersistedStore } from './observableStore';

export type EnableReminderResult = 'enabled' | 'permission-denied';

/** User settings, kept in sync with the scheduled daily reminder. */
export class SettingsService extends PersistedStore<Settings> {
  private readonly reminders: ReminderScheduler;

  constructor(storage: KeyValueStore, reminders: ReminderScheduler) {
    super(storage, 'settings', parseSettings);
    this.reminders = reminders;
  }

  async enableReminder(): Promise<EnableReminderResult> {
    if (!(await this.reminders.requestPermission())) return 'permission-denied';
    this.set({ ...this.getSnapshot(), reminderEnabled: true });
    await this.reminders.scheduleDaily(this.getSnapshot().reminderTime);
    return 'enabled';
  }

  async disableReminder(): Promise<void> {
    this.set({ ...this.getSnapshot(), reminderEnabled: false });
    await this.reminders.cancel();
  }

  async setReminderTime(time: ReminderTime): Promise<void> {
    this.set({ ...this.getSnapshot(), reminderTime: time });
    if (this.getSnapshot().reminderEnabled) await this.reminders.scheduleDaily(time);
  }

  /**
   * Makes the scheduled reminder match the settings. Run at startup: it repairs the schedule
   * after a reinstall, and turns the setting off if notification permission was revoked.
   */
  async syncReminder(): Promise<void> {
    const { reminderEnabled, reminderTime } = this.getSnapshot();
    if (!reminderEnabled) {
      await this.reminders.cancel();
      return;
    }
    if (!(await this.reminders.hasPermission())) {
      this.set({ ...this.getSnapshot(), reminderEnabled: false });
      await this.reminders.cancel();
      return;
    }
    await this.reminders.scheduleDaily(reminderTime);
  }
}
