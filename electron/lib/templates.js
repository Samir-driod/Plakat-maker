import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicWrite } from './atomicWrite.js';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_THUMB = 2 * 1024 * 1024;

function assertId(id) {
  if (typeof id !== 'string' || !ID.test(id)) throw new Error('Nieprawidłowy identyfikator szablonu.');
}

export function createTemplateStore(dir) {
  return {
    async list() {
      await fs.mkdir(dir, { recursive: true });
      const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
      const out = [];
      for (const f of files) {
        try {
          const meta = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
          if (ID.test(meta.id)) out.push({ id: meta.id, name: String(meta.name ?? 'Szablon'), thumb: meta.thumb ?? null, createdAt: meta.createdAt ?? '' });
        } catch {
          /* uszkodzony wpis — pomijamy */
        }
      }
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async save({ name, project, thumb }) {
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const safeThumb = typeof thumb === 'string' && thumb.startsWith('data:image/') && thumb.length < MAX_THUMB ? thumb : null;
      await atomicWrite(path.join(dir, `${id}.plakat`), String(project));
      await atomicWrite(path.join(dir, `${id}.json`), JSON.stringify({ id, name: String(name ?? 'Szablon').slice(0, 80), thumb: safeThumb, createdAt }));
      return id;
    },

    async read(id) {
      assertId(id);
      return fs.readFile(path.join(dir, `${id}.plakat`), 'utf8');
    },

    async remove(id) {
      assertId(id);
      await fs.rm(path.join(dir, `${id}.plakat`), { force: true });
      await fs.rm(path.join(dir, `${id}.json`), { force: true });
    },
  };
}
