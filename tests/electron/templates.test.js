import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createTemplateStore } from '../../electron/lib/templates.js';

let dir;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'plakat-tpl-')); });
afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

describe('createTemplateStore', () => {
  it('zapisuje, listuje, czyta i usuwa', async () => {
    const store = createTemplateStore(dir);
    const id = await store.save({ name: 'Promocja', project: '{"app":"plakat-maker"}', thumb: 'data:image/png;base64,AAAA' });
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id, name: 'Promocja', thumb: 'data:image/png;base64,AAAA' });
    expect(await store.read(id)).toBe('{"app":"plakat-maker"}');
    await store.remove(id);
    expect(await store.list()).toEqual([]);
  });
  it('odrzuca podejrzane identyfikatory i miniatury', async () => {
    const store = createTemplateStore(dir);
    await expect(store.read('..\\..\\windows')).rejects.toThrow(/identyfikator/);
    const id = await store.save({ name: 'X', project: '{}', thumb: 'javascript:alert(1)' });
    expect((await store.list())[0].thumb).toBeNull();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('pomija uszkodzone wpisy', async () => {
    const store = createTemplateStore(dir);
    await fs.writeFile(path.join(dir, 'zly.json'), '{nie');
    expect(await store.list()).toEqual([]);
  });
});
