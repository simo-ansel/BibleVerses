import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dayNumber, startOfDay } from '@/core/daily/calendar';

/** Today's date (at midnight). Moves to the new day when the app comes back after midnight. */
export function useToday(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = new Date();
      setToday((current) => (dayNumber(current) === dayNumber(now) ? current : startOfDay(now)));
    });
    return () => subscription.remove();
  }, []);
  return today;
}
