import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { formatLogLine, createLogger } from '../../electron/lib/logger.js';

let dir;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'plakat-log-')); });
afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

describe('logger', () => {
  it('formatuje linię', () => {
    expect(formatLogLine('ERROR', 'main', 'Boom \n', new Date('2026-10-30T10:00:00Z'))).toBe('2026-10-30T10:00:00.000Z [ERROR] main: Boom\n');
  });
  it('dopisuje i rotuje', async () => {
    const log = createLogger(dir, { maxBytes: 60 });
    await log.error('a', 'x'.repeat(50));
    await log.error('b', 'drugi');
    const current = await fs.readFile(log.file, 'utf8');
    const rotated = await fs.readFile(`${log.file}.1`, 'utf8');
    expect(rotated).toContain('[ERROR] a:');
    expect(current).toContain('[ERROR] b: drugi');
  });
});
