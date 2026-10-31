import { serializeProject, parseProject, ProjectError } from '../core/schema.js';
import { newDocument } from '../core/document.js';
import { sanitizeFileName } from '../core/exportSizes.js';
import { confirmDialog, alertDialog, toast, openModal } from '../ui/dialogs.js';
import { h } from '../ui/dom.js';

const baseName = (p) => (p ? p.split(/[\\/]/).pop() : null);

export function installProject(app) {
  const { api, store, selection } = app;
  let filePath = null;
  app.startupTasks ??= [];

  function refreshTitle() {
    const name = baseName(filePath) ?? `${store.doc.meta.name} (niezapisany)`;
    api.setTitle?.(`${store.dirty ? '● ' : ''}${name} - Plakat Maker`);
    api.setDirty?.(store.dirty);
  }
  store.subscribe(refreshTitle);

  function load(doc, assets, path, { dirty = false } = {}) {
    selection.clear();
    store.replace(doc, assets, { dirty });
    filePath = path;
    app.editor.fit();
    refreshTitle();
  }

  async function save({ saveAs = false } = {}) {
    if (!api.saveProject) {
      toast('Zapis jest niedostępny w tej wersji.', { type: 'error' });
      return false;
    }
    try {
      const text = serializeProject(store.doc, store.assets);
      const saved = await api.saveProject({ filePath, text, saveAs, suggestedName: sanitizeFileName(store.doc.meta.name) });
      if (!saved) return false;
      filePath = saved;
      store.markSaved();
      await api.autosaveClear?.();
      refreshTitle();
      toast(`Zapisano: ${baseName(saved)}`, { type: 'success' });
      return true;
    } catch (err) {
      await alertDialog('Nie udało się zapisać', `${err.message}\n\nSpróbuj „Zapisz jako…” w innym folderze.`);
      return false;
    }
  }

  async function confirmDiscard() {
    if (!store.dirty) return true;
    const choice = await confirmDialog({
      title: 'Niezapisane zmiany',
      message: 'Projekt ma niezapisane zmiany. Zapisać je przed kontynuacją?',
      buttons: [
        { id: 'cancel', label: 'Anuluj' },
        { id: 'discard', label: 'Nie zapisuj', kind: 'danger' },
        { id: 'save', label: 'Zapisz', kind: 'primary' },
      ],
    });
    if (choice === 'save') return save();
    return choice === 'discard';
  }

  async function openText(text, path, { dirty = false, quiet = false } = {}) {
    try {
      const { doc, assets, warnings } = parseProject(text);
      load(doc, assets, path, { dirty });
      if (warnings.length) {
        toast(`Projekt wczytany z poprawkami: ${warnings[0]}${warnings.length > 1 ? ` (i ${warnings.length - 1} więcej)` : ''}`, { timeout: 7000 });
      } else if (!quiet) {
        toast(`Otwarto: ${baseName(path) ?? doc.meta.name}`, { type: 'success' });
      }
      return true;
    } catch (err) {
      const message = err instanceof ProjectError ? err.message : `Nie udało się otworzyć projektu: ${err.message}`;
      await alertDialog('Nie można otworzyć projektu', message);
      return false;
    }
  }

  async function openPath(path) {
    try {
      const res = await api.readProject(path);
      await openText(res.text, res.path);
    } catch (err) {
      await alertDialog('Nie można otworzyć pliku', `${err.message}`);
    }
  }

  app.project = {
    get filePath() { return filePath; },
    confirmDiscard,
    openText,
  };

  Object.assign(app.actions, {
    async newProject() {
      if (!(await confirmDiscard())) return;
      if (app.actions.showNewProjectDialog) await app.actions.showNewProjectDialog();
      else app.actions.createProject(newDocument(), {});
    },
    createProject(doc, assets = {}) {
      load(doc, assets, null);
    },
    async openProject() {
      if (!(await confirmDiscard())) return;
      try {
        const res = await api.openProjectDialog?.();
        if (res) await openText(res.text, res.path);
      } catch (err) {
        await alertDialog('Nie można otworzyć pliku', err.message);
      }
    },
    async openProjectPath(path) {
      if (!(await confirmDiscard())) return;
      await openPath(path);
    },
    async openProjectFile(file) {
      if (!(await confirmDiscard())) return;
      await openText(await file.text(), api.pathForFile?.(file) ?? null);
    },
    async openRecent() {
      const list = (await api.listRecent?.()) ?? [];
      if (!list.length) {
        toast('Brak ostatnio otwieranych projektów.');
        return;
      }
      const modal = openModal({
        title: 'Ostatnie projekty',
        body: h('div', { class: 'layer-list' }, list.map((p) =>
          h('div', { class: 'layer-row', title: p, onClick: () => { modal.close(null); app.actions.openProjectPath(p); } },
            h('span', { class: 'layer-name' }, baseName(p)),
            h('span', { class: 'hint' }, p.length > 60 ? `…${p.slice(-58)}` : p)))),
        actions: [{ id: null, label: 'Zamknij' }],
      });
    },
    saveProject: () => save(),
    saveProjectAs: () => save({ saveAs: true }),
  });

  api.onOpenFile?.((path) => app.actions.openProjectPath(path));
  api.onCloseRequested?.(async () => {
    if (await confirmDiscard()) {
      await api.autosaveClear?.();
      api.confirmClose();
    }
  });

  app.startupTasks.push(async () => {
    const files = (await api.startupFiles?.()) ?? [];
    if (files.length) await app.actions.openProjectPath(files[0]);
  });
  refreshTitle();
}
