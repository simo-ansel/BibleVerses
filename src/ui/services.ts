import { createContext, useContext, useSyncExternalStore } from 'react';

import type { AppServices } from '@/application/AppServices';
import type { Observable } from '@/application/observableStore';

/** Provided once at the root by src/composition; screens never construct services themselves. */
export const AppServicesContext = createContext<AppServices | null>(null);

export function useServices(): AppServices {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error('useServices must be used inside the app services provider.');
  return services;
}

/** Subscribes a component to an observable store from the application layer. */
export function useObservable<T>(store: Observable<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
