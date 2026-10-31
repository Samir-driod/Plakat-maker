import { h } from '../dom.js';
import { button, section } from '../controls.js';
import { TYPE_NAMES } from '../../core/model.js';
import { renameElement, toggleHidden, setLocked, reorder } from '../../core/elementOps.js';
import { promptDialog } from '../dialogs.js';

export const layersPanel = {
  id: 'layers',
  label: 'Warstwy',
  key(doc, selection) {
    const boxes = doc.boxes[doc.orientation];
    return doc.order.map((id) => {
      const el = doc.elements[id];
      return `${id}:${el.name}:${el.locked ? 1 : 0}:${boxes[id]?.hidden ? 1 : 0}:${selection.has(id) ? 1 : 0}`;
    }).join('|');
  },
  render(root, { app }) {
    const { store, selection } = app;
    const doc = store.doc;
    const boxes = doc.boxes[doc.orientation];
    const rows = [...doc.order].reverse().map((id) => {
      const el = doc.elements[id];
      const hidden = !!boxes[id]?.hidden;
      const stop = (fn) => (e) => {
        e.stopPropagation();
        fn();
      };
      return h('div', {
        class: `layer-row${selection.has(id) ? ' selected' : ''}${hidden ? ' hidden-el' : ''}`,
        'data-testid': `layer-${id}`,
        onClick: (e) => (e.shiftKey || e.ctrlKey ? selection.toggle(id) : selection.set([id])),
        onDblclick: async () => {
          const name = await promptDialog({ title: 'Zmień nazwę warstwy', label: 'Nazwa', value: el.name });
          if (name) store.update((d) => renameElement(d, id, name) || false);
        },
      },
      h('span', { class: 'layer-type' }, TYPE_NAMES[el.type]),
      h('span', { class: 'layer-name', title: 'Dwuklik — zmiana nazwy' }, el.name),
      h('span', { class: 'layer-actions' },
        button(hidden ? '◌' : '◉', stop(() => store.update((d) => { toggleHidden(d, [id]); })), { small: true, kind: 'ghost', title: hidden ? 'Pokaż w tej orientacji' : 'Ukryj w tej orientacji' }),
        button(el.locked ? '🔒' : '🔓', stop(() => store.update((d) => { setLocked(d, [id], !el.locked); })), { small: true, kind: 'ghost', title: el.locked ? 'Odblokuj' : 'Zablokuj' }),
        button('↑', stop(() => store.update((d) => reorder(d, [id], 'forward') || false)), { small: true, kind: 'ghost', title: 'Warstwa wyżej' }),
        button('↓', stop(() => store.update((d) => reorder(d, [id], 'backward') || false)), { small: true, kind: 'ghost', title: 'Warstwa niżej' })));
    });
    root.append(section('Warstwy (od góry)', [
      h('div', { class: 'layer-list' }, rows),
      h('p', { class: 'hint' }, 'Klik — zaznacz, Shift+klik — dodaj do zaznaczenia, dwuklik — zmień nazwę. Ukrycie dotyczy tylko bieżącej orientacji.'),
      h('div', { class: 'btn-row' },
        button('Na wierzch', () => app.actions.reorderSelection('front'), { small: true }),
        button('Na spód', () => app.actions.reorderSelection('back'), { small: true })),
    ]));
  },
};
