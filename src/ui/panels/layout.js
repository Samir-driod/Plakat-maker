import { h } from '../dom.js';
import { selectField, numberField, toggleField, slider, segmented, button, section } from '../controls.js';
import { LAYOUTS, LAYOUT_ROLES, computeLayout, applyLayout } from '../../core/layouts.js';
import { chooseLayout, setFormat } from '../../core/document.js';
import { FORMAT_PRESETS, MIN_FORMAT, MAX_FORMAT } from '../../core/constants.js';
import { toast } from '../dialogs.js';

const ROLE_COLORS = {
  photo: '#6b7a99', panel: 'rgba(255,255,255,0.14)', accent: '#4f8cff', title: '#e8eaf0',
  subtitle: '#9aa1b2', points: '#7d8597', qr: '#ffffff', footer: '#5c6375',
};

export function layoutPreviewSvg(layoutId, format, orientation) {
  const boxes = computeLayout(layoutId, format, orientation);
  const rects = LAYOUT_ROLES.filter((role) => !boxes[role].hidden).map((role) => {
    const b = boxes[role];
    return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${role === 'photo' ? 24 : 8}" fill="${ROLE_COLORS[role]}"/>`;
  });
  return `<svg viewBox="0 0 ${format.w} ${format.h}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><rect width="${format.w}" height="${format.h}" fill="#2a2f3b"/>${rects.join('')}</svg>`;
}

export function bindSetting(control, settings, key) {
  control.set(settings.get(key));
  control.onChange((value) => settings.set({ [key]: value }));
  return settings.subscribe((values) => control.set(values[key]));
}

function orientationSection(app, binder) {
  const seg = segmented({
    options: [
      { value: 'landscape', label: '▭ Poziomo', title: 'Ctrl+1' },
      { value: 'portrait', label: '▯ Pionowo', title: 'Ctrl+2' },
    ],
    testId: 'layout-orientation',
  });
  seg.set(app.store.doc.orientation);
  seg.onChange((o) => app.actions.setOrientation(o));
  binder.watch((doc) => seg.set(doc.orientation));
  return section('Orientacja', [
    seg.el,
    h('p', { class: 'hint' }, 'Każda orientacja ma własne położenie elementów, ale wspólną treść i wygląd. Eksport może zapisać obie naraz.'),
  ]);
}

function formatSection(app, binder) {
  const doc = app.store.doc;
  const select = selectField({
    label: 'Format ekranu',
    options: [...FORMAT_PRESETS.map((p) => ({ value: p.id, label: p.label })), { value: 'custom', label: 'Własny rozmiar…' }],
    testId: 'format-select',
  });
  select.set(doc.formatId);
  select.onChange((id) => app.store.update((d) => {
    if (id === 'custom') setFormat(d, 'custom', d.formats.landscape);
    else setFormat(d, id);
  }));
  binder.watch((d) => select.set(d.formatId));
  const parts = [select.el];

  if (doc.formatId === 'custom') {
    const w = numberField({ label: 'Szerokość (px)', min: MIN_FORMAT, max: MAX_FORMAT, testId: 'custom-w' });
    const hgt = numberField({ label: 'Wysokość (px)', min: MIN_FORMAT, max: MAX_FORMAT, testId: 'custom-h' });
    w.set(doc.formats.landscape.w);
    hgt.set(doc.formats.landscape.h);
    const apply = () => app.store.update((d) => {
      setFormat(d, 'custom', { w: Number(w.input.value), h: Number(hgt.input.value) });
    });
    parts.push(h('div', { class: 'two-col' }, w.el, hgt.el), button('Zastosuj rozmiar', apply, { kind: 'primary' }));
  }
  parts.push(
    h('p', { class: 'hint' }, 'Zmiana formatu przeskalowuje elementy. Użyj „Ułóż ponownie”, aby dopasować układ.'),
    h('div', { class: 'btn-row' },
      button('Ułóż ponownie tę orientację', () => {
        app.store.update((d) => {
          applyLayout(d, d.layoutId, [d.orientation]);
        });
        toast('Elementy wróciły na miejsca z wybranego układu.');
      }, { testId: 'relayout' })),
  );
  return section('Format', parts);
}

function layoutsSection(app, binder) {
  const doc = app.store.doc;
  const format = doc.formats[doc.orientation];
  const cards = Object.entries(LAYOUTS).map(([id, def]) =>
    h('div', {
      class: 'card',
      'data-layout': id,
      'data-testid': `layout-${id}`,
      title: def.name,
      onClick: () => app.store.update((d) => {
        chooseLayout(d, id);
      }),
    },
    h('div', { class: 'card-preview', html: layoutPreviewSvg(id, format, doc.orientation) }),
    h('div', { class: 'card-name' }, def.name)));
  binder.watch((d) => {
    for (const card of cards) card.classList.toggle('active', card.dataset.layout === d.layoutId);
  });
  return section('Układ elementów', [
    h('div', { class: 'card-grid' }, cards),
    h('p', { class: 'hint' }, 'Wybór układu ustawia elementy w obu orientacjach. Potem możesz je dowolnie przeciągać.'),
  ]);
}

function helpersSection(app) {
  const grid = toggleField({ label: 'Pokaż siatkę (Ctrl+G)', testId: 'toggle-grid' });
  const gridSize = slider({ label: 'Rozmiar siatki', min: 10, max: 200, step: 5, unit: ' px' });
  const safe = toggleField({ label: 'Pokaż obszar bezpieczny TV (Ctrl+Shift+G)', testId: 'toggle-safe' });
  const snap = toggleField({ label: 'Przyciąganie do linii pomocniczych', testId: 'toggle-snap' });
  const offs = [
    bindSetting(grid, app.settings, 'showGrid'),
    bindSetting(gridSize, app.settings, 'gridSize'),
    bindSetting(safe, app.settings, 'showSafeArea'),
    bindSetting(snap, app.settings, 'snap'),
  ];
  const el = section('Pomoce', [
    grid.el,
    gridSize.el,
    safe.el,
    h('p', { class: 'hint' }, 'Niektóre telewizory obcinają brzegi obrazu, więc trzymaj ważne rzeczy w pomarańczowej ramce.'),
    snap.el,
  ]);
  return { el, dispose: () => offs.forEach((off) => off()) };
}

export const layoutPanel = {
  id: 'layout',
  label: 'Układ',
  key(doc) {
    const f = doc.formats[doc.orientation];
    return `${doc.orientation}|${doc.formatId}|${f.w}x${f.h}`;
  },
  render(root, { app, binder }) {
    const helpers = helpersSection(app);
    root.append(orientationSection(app, binder), layoutsSection(app, binder), formatSection(app, binder), helpers.el);
    root.addEventListener('panel:dispose', helpers.dispose, { once: true });
  },
};
