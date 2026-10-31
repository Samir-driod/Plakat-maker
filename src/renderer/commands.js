import {
  duplicateElements, deleteElements, reorder, nudge, toggleHidden, setLocked, addElement,
} from '../core/elementOps.js';
import { alignBoxes, distributeBoxes } from '../core/align.js';
import { toast } from '../ui/dialogs.js';

const plural = (n, one, few, many) => {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
};

export function installCommands(app) {
  const { store, selection } = app;
  const selected = () => selection.ids.filter((id) => store.doc.elements[id]);

  function add(type, overrides = {}) {
    let id;
    store.update((doc) => {
      id = addElement(doc, type, { overrides });
    });
    selection.set([id]);
  }

  Object.assign(app.actions, {
    undo() {
      if (!store.undo()) toast('Nie ma czego cofnąć.');
    },
    redo() {
      if (!store.redo()) toast('Nie ma czego ponowić.');
    },
    deleteSelection() {
      const ids = selected();
      if (!ids.length) return;
      store.update((doc) => {
        deleteElements(doc, ids);
      });
      selection.clear();
      toast(`Usunięto ${ids.length} ${plural(ids.length, 'element', 'elementy', 'elementów')} (Ctrl+Z cofa).`);
    },
    duplicateSelection() {
      const ids = selected();
      if (!ids.length) return;
      let created = [];
      store.update((doc) => {
        created = duplicateElements(doc, ids);
      });
      selection.set(created);
    },
    selectAll() {
      const doc = store.doc;
      selection.set(doc.order.filter((id) => !doc.elements[id].locked && !doc.boxes[doc.orientation][id]?.hidden));
    },
    deselect() {
      if (selection.cropId) selection.setCrop(null);
      else selection.clear();
    },
    nudgeSelection(dx, dy) {
      const ids = selected();
      if (!ids.length) return;
      store.update((doc) => nudge(doc, ids, dx, dy) || false, { key: 'nudge' });
    },
    reorderSelection(mode) {
      const ids = selected();
      if (!ids.length) return;
      store.update((doc) => reorder(doc, ids, mode) || false);
    },
    toggleLockSelection() {
      const ids = selected();
      if (!ids.length) return;
      const lock = ids.some((id) => !store.doc.elements[id].locked);
      store.update((doc) => {
        setLocked(doc, ids, lock);
      });
      toast(lock ? 'Zablokowano. Element nie będzie się przesuwał.' : 'Odblokowano.');
    },
    toggleHiddenSelection() {
      const ids = selected();
      if (!ids.length) return;
      store.update((doc) => {
        toggleHidden(doc, ids);
      });
    },
    setOrientation(orientation) {
      if (store.doc.orientation === orientation) return;
      selection.setCrop(null);
      store.update((doc) => {
        doc.orientation = orientation;
      }, { history: false, reason: 'orientation' });
    },
    toggleOrientation() {
      app.actions.setOrientation(store.doc.orientation === 'landscape' ? 'portrait' : 'landscape');
    },
    addText: () => add('text', { text: 'Nowy tekst', size: 64 }),
    addShape: (kind = 'rect') => add('shape', { shape: kind }),
    addQr: () => add('qr'),
    alignSelection(mode) {
      const ids = selected();
      if (!ids.length) return;
      const doc = store.doc;
      const f = doc.formats[doc.orientation];
      const boxes = ids.map((id) => ({ id, ...doc.boxes[doc.orientation][id] }));
      const placed = alignBoxes(boxes, mode, ids.length === 1 ? { x: 0, y: 0, w: f.w, h: f.h } : null);
      store.update((d) => {
        for (const p of placed) {
          if (d.elements[p.id].locked) continue;
          Object.assign(d.boxes[d.orientation][p.id], { x: p.x, y: p.y });
        }
      });
    },
    distributeSelection(axis) {
      const ids = selected();
      if (ids.length < 3) {
        toast('Zaznacz co najmniej 3 elementy, aby rozłożyć je równomiernie.');
        return;
      }
      const doc = store.doc;
      const placed = distributeBoxes(ids.map((id) => ({ id, ...doc.boxes[doc.orientation][id] })), axis);
      store.update((d) => {
        for (const p of placed) {
          if (d.elements[p.id].locked) continue;
          Object.assign(d.boxes[d.orientation][p.id], { x: p.x, y: p.y });
        }
      });
    },
  });
}
