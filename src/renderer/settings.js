import { DEFAULT_SETTINGS, mergeSettings } from '../core/settings.js';

export async function createSettings(api) {
  let values = structuredClone(DEFAULT_SETTINGS);
  try {
    if (api?.getSettings) values = mergeSettings(await api.getSettings());
  } catch (err) {
    console.warn('Nie udało się wczytać ustawień — używam domyślnych.', err);
  }
  const listeners = new Set();
  return {
    get: (key) => values[key],
    get all() { return values; },
    async set(patch) {
      values = mergeSettings({ ...values, ...patch });
      listeners.forEach((fn) => fn(values));
      try {
        await api?.setSettings?.(patch);
      } catch (err) {
        console.warn('Nie udało się zapisać ustawień.', err);
      }
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
