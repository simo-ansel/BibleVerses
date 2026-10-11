export interface ReminderTime {
  readonly hour: number;
  readonly minute: number;
}

export interface Settings {
  readonly reminderEnabled: boolean;
  readonly reminderTime: ReminderTime;
}

export const DEFAULT_SETTINGS: Settings = {
  reminderEnabled: false,
  reminderTime: { hour: 8, minute: 0 },
};

const isIntBelow = (value: unknown, limit: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < limit;

/** Reads stored settings defensively: unknown or malformed fields fall back to defaults. */
export function parseSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null) return DEFAULT_SETTINGS;
  const raw = value as { reminderEnabled?: unknown; reminderTime?: { hour?: unknown; minute?: unknown } };
  const hour = raw.reminderTime?.hour;
  const minute = raw.reminderTime?.minute;
  return {
    reminderEnabled: typeof raw.reminderEnabled === 'boolean' ? raw.reminderEnabled : DEFAULT_SETTINGS.reminderEnabled,
    reminderTime: isIntBelow(hour, 24) && isIntBelow(minute, 60) ? { hour, minute } : DEFAULT_SETTINGS.reminderTime,
  };
}

export function formatTime({ hour, minute }: ReminderTime): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
