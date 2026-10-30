import { createHistory } from './history.js';
import { newId } from './ids.js';

export function createStore(initialDoc, { history = createHistory() } = {}) {
  let doc = initialDoc;
  let assets = {};
  let dirty = false;
  const listeners = new Set();

  function emit(change) {
    for (const listener of [...listeners]) {
      try {
        listener(doc, change);
      } catch (err) {
        console.error('Błąd subskrybenta store:', err);
      }
    }
  }

  return {
    get doc() { return doc; },
    get assets() { return assets; },
    get dirty() { return dirty; },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    update(recipe, { history: useHistory = true, key = null, reason = 'edit' } = {}) {
      const draft = structuredClone(doc);
      if (recipe(draft) === false) return false;
      if (useHistory) history.record(doc, key);
      doc = draft;
      dirty = true;
      emit({ reason });
      return true;
    },

    addAsset(asset) {
      const id = newId('asset');
      assets = { ...assets, [id]: asset };
      return id;
    },

    getAsset(id) {
      return (id && assets[id]) || null;
    },

    replace(nextDoc, nextAssets = {}, { dirty: nextDirty = false } = {}) {
      doc = nextDoc;
      assets = { ...nextAssets };
      history.clear();
      dirty = nextDirty;
      emit({ reason: 'load' });
    },

    undo() {
      const prev = history.undo(doc);
      if (!prev) return false;
      doc = prev;
      dirty = true;
      emit({ reason: 'undo' });
      return true;
    },

    redo() {
      const next = history.redo(doc);
      if (!next) return false;
      doc = next;
      dirty = true;
      emit({ reason: 'redo' });
      return true;
    },

    canUndo: () => history.canUndo(),
    canRedo: () => history.canRedo(),

    markSaved() {
      dirty = false;
      emit({ reason: 'saved' });
    },

    breakCoalescing() {
      history.breakCoalescing();
    },
  };
}
