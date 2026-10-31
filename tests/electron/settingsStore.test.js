import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createSettingsStore } from '../../electron/lib/settingsStore.js';
import { DEFAULT_SETTINGS } from '../../src/core/settings.js';

let dir;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'plakat-set-')); });
afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

describe('createSettingsStore', () => {
  it('domyślne, gdy brak pliku', async () => {
    expect(await createSettingsStore(path.join(dir, 's.json')).load()).toEqual(DEFAULT_SETTINGS);
  });
  it('zapisuje i wczytuje ponownie', async () => {
    const file = path.join(dir, 's.json');
    await createSettingsStore(file).update({ exportScale: 2, snap: false });
    const again = await createSettingsStore(file).load();
    expect(again.exportScale).toBe(2);
    expect(again.snap).toBe(false);
  });
  it('uszkodzony plik → domyślne', async () => {
    const file = path.join(dir, 's.json');
    await fs.writeFile(file, '{zepsute');
    expect(await createSettingsStore(file).load()).toEqual(DEFAULT_SETTINGS);
  });
  it('równoległe zmiany nie gubią się', async () => {
    const file = path.join(dir, 's.json');
    const store = createSettingsStore(file);
    await Promise.all([store.update({ exportScale: 3 }), store.update({ showGrid: true })]);
    const again = await createSettingsStore(file).load();
    expect(again.exportScale).toBe(3);
    expect(again.showGrid).toBe(true);
  });
});
