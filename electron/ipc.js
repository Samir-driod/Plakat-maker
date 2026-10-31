import { app, dialog, ipcMain, shell, clipboard, ClipboardItem, screen } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { atomicWrite, readTextSafe } from './lib/atomicWrite.js';
import { addRecent, removeRecent } from './lib/recent.js';

const MAX_PROJECT_BYTES = 300 * 1024 * 1024;
const PROJECT_FILTER = [{ name: 'Projekt Plakat Maker', extensions: ['plakat'] }];
const EXPORT_FILTERS = {
  png: [{ name: 'Obraz PNG', extensions: ['png'] }],
  jpg: [{ name: 'Obraz JPG', extensions: ['jpg', 'jpeg'] }],
  pdf: [{ name: 'Dokument PDF', extensions: ['pdf'] }],
};

const isProjectPath = (p) => typeof p === 'string' && p.toLowerCase().endsWith('.plakat');
const toBuffer = (bytes) => Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));

export function registerIpc({ getWindow, settings, templates, logger, e2eDir, state }) {
  const autosaveFile = path.join(app.getPath('userData'), 'autosave.plakat.json');

  function handle(channel, fn) {
    ipcMain.handle(channel, async (event, ...args) => {
      if (!event.senderFrame?.url?.startsWith('file:')) throw new Error('Niedozwolone źródło wywołania.');
      try {
        return await fn(...args);
      } catch (err) {
        logger.error(`ipc:${channel}`, err?.stack ?? err);
        throw err;
      }
    });
  }

  async function remember(filePath) {
    const s = await settings.load();
    await settings.update({ recent: addRecent(s.recent, filePath), lastProjectDir: path.dirname(filePath) });
  }

  async function readProjectFile(filePath) {
    if (!isProjectPath(filePath)) throw new Error('To nie jest plik projektu .plakat.');
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_PROJECT_BYTES) throw new Error('Plik projektu jest zbyt duży.');
    const text = await fs.readFile(filePath, 'utf8');
    await remember(filePath);
    return { path: filePath, text };
  }

  handle('settings:get', () => settings.load());
  handle('settings:set', (patch) => settings.update(patch));

  handle('project:open', async () => {
    if (e2eDir) return readProjectFile(path.join(e2eDir, 'projekt.plakat'));
    const s = await settings.load();
    const res = await dialog.showOpenDialog(getWindow(), {
      title: 'Otwórz projekt',
      defaultPath: s.lastProjectDir || app.getPath('documents'),
      filters: PROJECT_FILTER,
      properties: ['openFile'],
    });
    return res.canceled || !res.filePaths[0] ? null : readProjectFile(res.filePaths[0]);
  });

  handle('project:read', (filePath) => readProjectFile(filePath));

  handle('project:save', async ({ filePath, text, saveAs, suggestedName }) => {
    let target = filePath;
    if (e2eDir) target = path.join(e2eDir, 'projekt.plakat');
    else if (!target || saveAs) {
      const s = await settings.load();
      const res = await dialog.showSaveDialog(getWindow(), {
        title: 'Zapisz projekt',
        defaultPath: path.join(s.lastProjectDir || app.getPath('documents'), `${suggestedName || 'plakat'}.plakat`),
        filters: PROJECT_FILTER,
      });
      if (res.canceled || !res.filePath) return null;
      target = res.filePath.toLowerCase().endsWith('.plakat') ? res.filePath : `${res.filePath}.plakat`;
    }
    await atomicWrite(target, String(text), { backup: true });
    await remember(target);
    return target;
  });

  handle('export:save', async ({ defaultName, ext, bytes }) => {
    const filters = EXPORT_FILTERS[ext];
    if (!filters) throw new Error('Nieznany format eksportu.');
    const s = await settings.load();
    let target = e2eDir ? path.join(e2eDir, path.basename(defaultName)) : null;
    if (!target) {
      const res = await dialog.showSaveDialog(getWindow(), {
        title: 'Zapisz plakat',
        defaultPath: path.join(s.lastExportDir || app.getPath('pictures'), path.basename(defaultName)),
        filters,
      });
      if (res.canceled || !res.filePath) return null;
      target = res.filePath;
    }
    await atomicWrite(target, toBuffer(bytes));
    await settings.update({ lastExportDir: path.dirname(target) });
    return target;
  });

  handle('export:saveMany', async ({ files }) => {
    const s = await settings.load();
    let dir = e2eDir;
    if (!dir) {
      const res = await dialog.showOpenDialog(getWindow(), {
        title: 'Wybierz folder na pliki plakatu',
        defaultPath: s.lastExportDir || app.getPath('pictures'),
        properties: ['openDirectory', 'createDirectory'],
      });
      if (res.canceled || !res.filePaths[0]) return null;
      dir = res.filePaths[0];
    }
    for (const f of files) await atomicWrite(path.join(dir, path.basename(f.name)), toBuffer(f.bytes));
    await settings.update({ lastExportDir: dir });
    return dir;
  });

  handle('shell:showItem', async (p) => {
    if (typeof p === 'string') shell.showItemInFolder(p);
  });

  handle('clipboard:writeImage', async (dataUrl) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png')) throw new Error('Nieprawidłowy obraz.');
    const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([buf], { type: 'image/png' }) })]);
  });

  handle('autosave:write', (text) => atomicWrite(autosaveFile, String(text)));
  handle('autosave:read', () => readTextSafe(autosaveFile));
  handle('autosave:clear', () => fs.rm(autosaveFile, { force: true }));

  handle('templates:list', () => templates.list());
  handle('templates:read', (id) => templates.read(id));
  handle('templates:save', (t) => templates.save(t));
  handle('templates:delete', (id) => templates.remove(id));

  handle('recent:list', async () => {
    const s = await settings.load();
    const existing = [];
    for (const p of s.recent) {
      try {
        await fs.access(p);
        existing.push(p);
      } catch {
        /* plik usunięty lub przeniesiony */
      }
    }
    return existing;
  });
  handle('recent:remove', async (p) => {
    const s = await settings.load();
    return (await settings.update({ recent: removeRecent(s.recent, String(p)) })).recent;
  });

  handle('app:setTitle', async (title) => {
    getWindow()?.setTitle(String(title).slice(0, 200));
  });
  handle('app:setDirty', async (dirty) => {
    state.dirty = !!dirty;
  });
  handle('app:confirmClose', async () => {
    state.forceClose = true;
    getWindow()?.close();
  });
  handle('app:startupFiles', async () => state.takeStartupFiles());
  handle('log:error', async (message) => {
    await logger.error('renderer', String(message).slice(0, 8000));
  });

  handle('displays:list', async () => {
    const primary = screen.getPrimaryDisplay();
    return screen.getAllDisplays().map((d, i) => ({
      id: d.id,
      label: `Ekran ${i + 1}${d.id === primary.id ? ' (główny)' : ''} — ${d.size.width}×${d.size.height}`,
      width: d.size.width,
      height: d.size.height,
      scaleFactor: d.scaleFactor,
      primary: d.id === primary.id,
    }));
  });

  return { handle };
}
