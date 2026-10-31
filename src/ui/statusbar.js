import { h, clear } from './dom.js';

export function installStatusbar(app) {
  const root = document.getElementById('statusbar');
  const slots = {
    format: h('span', { class: 'status-item' }),
    zoom: h('span', { class: 'status-item' }),
    selection: h('span', { class: 'status-item' }),
    info: h('span', { class: 'status-item spacer' }),
    autosave: h('span', { class: 'status-item' }),
    dirty: h('span', { class: 'status-item', 'data-testid': 'status-dirty' }),
  };
  clear(root).append(...Object.values(slots));
  app.ui.status = {
    set(slot, text) {
      if (slots[slot]) slots[slot].textContent = text;
    },
  };

  const refreshDoc = () => {
    const doc = app.store.doc;
    const f = doc.formats[doc.orientation];
    slots.format.textContent = `${f.w} × ${f.h} px · ${doc.orientation === 'landscape' ? 'poziomo' : 'pionowo'}`;
    slots.dirty.textContent = app.store.dirty ? '● Niezapisane zmiany' : '✓ Zapisano';
  };
  const refreshSelection = () => {
    const ids = app.selection.ids.filter((id) => app.store.doc.elements[id]);
    slots.selection.textContent = !ids.length
      ? 'Nic nie zaznaczono'
      : ids.length === 1
        ? `Zaznaczono: ${app.store.doc.elements[ids[0]].name}`
        : `Zaznaczono elementów: ${ids.length}`;
  };
  app.store.subscribe(() => {
    refreshDoc();
    refreshSelection();
  });
  app.selection.subscribe(refreshSelection);
  app.editor.on('view', (view) => {
    slots.zoom.textContent = `Powiększenie ${Math.round(view.scale * 100)}%`;
  });
  refreshDoc();
  refreshSelection();
}
