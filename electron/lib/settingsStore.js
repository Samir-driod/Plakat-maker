import { mergeSettings } from '../../src/core/settings.js';
import { atomicWrite, readTextSafe } from './atomicWrite.js';

export function createSettingsStore(filePath) {
  let values = null;
  let loading = null;
  let queue = Promise.resolve();

  function load() {
    // Jedno wspólne wczytanie — równoległe wywołania nie nadpiszą sobie wartości.
    loading ??= (async () => {
      try {
        const text = await readTextSafe(filePath);
        values = mergeSettings(text ? JSON.parse(text) : {});
      } catch {
        values = mergeSettings({});
      }
      return values;
    })();
    return loading.then(() => values);
  }

  async function update(patch) {
    await load();
    values = mergeSettings({ ...values, ...(patch && typeof patch === 'object' ? patch : {}) });
    const snapshot = JSON.stringify(values, null, 2);
    queue = queue
      .then(() => atomicWrite(filePath, snapshot))
      .catch((err) => console.error('Nie udało się zapisać ustawień:', err));
    await queue;
    return values;
  }

  return { load, update };
}
