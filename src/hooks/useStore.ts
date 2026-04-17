import { useSyncExternalStore } from 'react';
import { subscribe, isHydrated } from '@/lib/store';

// Re-renders the component whenever the in-memory store cache mutates.
// Returns a boolean indicating whether the DB has finished hydrating.
export function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    () => isHydrated(),
    () => false,
  );
}

// Subscribe to any store change. Return value is a tick counter so components
// re-render on mutation.
export function useStoreTick(): number {
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    () => tick,
    () => 0,
  );
}

let tick = 0;
// bump tick on any change
subscribe(() => {
  tick++;
});
