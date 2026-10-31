import { projectToObject } from '../core/schema.js';
import { AUTOSAVE_DELAY_MS } from '../core/constants.js';
import { confirmDialog, toast } from '../ui/dialogs.js';

export function installAutosave(app) {
  const { api, store, settings } = app;
  if (!api.autosaveWrite) return;
  let timer = null;
  let writing = false;
  let again = false;

  async function write() {
    clearTimeout(timer);
    timer = null;
    if (!store.dirty || !settings.get('autosave')) return;
    if (writing) {
      again = true;
      return;
    }
    writing = true;
    try {
      const payload = JSON.stringify({
        autosave: 1,
        savedAt: new Date().toISOString(),
        path: app.project?.filePath ?? null,
        project: projectToObject(store.doc, store.assets),
      });
      await api.autosaveWrite(payload);
      app.ui.status?.set('autosave', `Autozapis ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
    } catch (err) {
      console.warn('Autozapis nie powiódł się:', err);
      app.ui.status?.set('autosave', '⚠ Autozapis nie powiódł się');
    } finally {
      writing = false;
      if (again) {
        again = false;
        schedule();
      }
    }
  }

  function schedule() {
    if (!timer) timer = setTimeout(write, AUTOSAVE_DELAY_MS);
  }

  store.subscribe((_doc, change) => {
    if (change.reason === 'saved') {
      clearTimeout(timer);
      timer = null;
      app.ui.status?.set('autosave', '');
      return;
    }
    if (store.dirty) schedule();
  });
  window.addEventListener('blur', () => {
    if (store.dirty) write();
  });

  app.startupTasks.unshift(async () => {
    let text;
    try {
      text = await api.autosaveRead();
    } catch {
      return;
    }
    if (!text) return;
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      await api.autosaveClear();
      return;
    }
    if (data?.autosave !== 1 || !data.project) {
      await api.autosaveClear();
      return;
    }
    const when = new Date(data.savedAt).toLocaleString('pl-PL');
    const file = data.path ? ` (${data.path.split(/[\\/]/).pop()})` : '';
    const choice = await confirmDialog({
      title: 'Odzyskiwanie pracy',
      message: `Znaleziono niezapisaną pracę z ${when}${file}.\nPrzywrócić ją?`,
      buttons: [
        { id: 'discard', label: 'Odrzuć', kind: 'danger' },
        { id: 'restore', label: 'Przywróć', kind: 'primary' },
      ],
    });
    if (choice === 'discard') {
      await api.autosaveClear();
      return;
    }
    if (choice !== 'restore') return; // Esc — zostawiamy plik na później
    const ok = await app.project.openText(JSON.stringify(data.project), data.path ?? null, { dirty: true, quiet: true });
    if (ok) toast('Przywrócono niezapisaną pracę. Zapisz ją (Ctrl+S).', { type: 'success', timeout: 6000 });
  });
}
