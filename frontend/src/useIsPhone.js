import { useSyncExternalStore } from 'react';

// Must match the phone breakpoint in App.css ("@media (max-width: 720px)").
export const PHONE_QUERY = '(max-width: 720px)';

function subscribe(callback) {
  const mql = window.matchMedia(PHONE_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

const getSnapshot = () => window.matchMedia(PHONE_QUERY).matches;

// True on phone-width screens, and updates on rotate/resize. Tabs use it to
// pick between the original desktop JSX and the phone layout, so desktop and
// tablet render exactly what they did before.
export function useIsPhone() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
