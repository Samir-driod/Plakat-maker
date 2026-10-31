import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { atomicWrite, readTextSafe } from '../../electron/lib/atomicWrite.js';

let dir;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'plakat-aw-')); });
afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

describe('atomicWrite', () => {
  it('zapisuje nowy plik i tworzy katalogi', async () => {
    const file = path.join(dir, 'a', 'b', 'x.txt');
    await atomicWrite(file, 'cześć');
    expect(await fs.readFile(file, 'utf8')).toBe('cześć');
  });
  it('nadpisuje z kopią .bak i nie zostawia plików tymczasowych', async () => {
    const file = path.join(dir, 'p.plakat');
    await atomicWrite(file, 'v1');
    await atomicWrite(file, 'v2', { backup: true });
    expect(await fs.readFile(file, 'utf8')).toBe('v2');
    expect(await fs.readFile(`${file}.bak`, 'utf8')).toBe('v1');
    const files = await fs.readdir(dir);
    expect(files.filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });
  it('zapisuje dane binarne', async () => {
    const file = path.join(dir, 'b.bin');
    await atomicWrite(file, Buffer.from([1, 2, 3]));
    expect([...(await fs.readFile(file))]).toEqual([1, 2, 3]);
  });
});

describe('readTextSafe', () => {
  it('null dla brakującego pliku', async () => {
    expect(await readTextSafe(path.join(dir, 'nie.txt'))).toBeNull();
  });
});
