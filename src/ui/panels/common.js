import { h } from '../dom.js';
import { textField, selectField, toggleField, button } from '../controls.js';
import { restoreRole } from '../../core/document.js';
import { MAX_POINTS } from '../../core/constants.js';
import { QR_KINDS, QR_FIELDS, qrValidationError } from '../../core/qr.js';

export const elProp = (id, key) => ({
  get: (doc) => doc.elements[id]?.[key],
  set: (doc, value) => {
    const el = doc.elements[id];
    if (!el) return false;
    el[key] = value;
  },
  key: `el:${id}:${key}`,
});

export function visibilityToggle(binder, id) {
  const t = toggleField({ label: 'Widoczny w tej orientacji', testId: `visible-${id}` });
  binder.bind(t, {
    get: (doc) => !doc.boxes[doc.orientation][id]?.hidden,
    set: (doc, visible) => {
      const b = doc.boxes[doc.orientation][id];
      if (!b) return false;
      b.hidden = !visible;
    },
  });
  return t.el;
}

export function restoreBox(app, role, title) {
  return h('div', {},
    h('p', { class: 'hint' }, `Element „${title}” został usunięty z plakatu.`),
    button(`Przywróć: ${title}`, () => {
      let id;
      app.store.update((doc) => {
        id = restoreRole(doc, role);
      });
      app.selection.set([id]);
    }, { kind: 'primary', testId: `restore-${role}` }));
}

export function pointsEditor(app, binder, id) {
  const el = app.store.doc.elements[id];
  const count = el.items.length;
  const update = (fn) => app.store.update((doc) => {
    const e = doc.elements[id];
    if (!e?.items) return false;
    e.itemStyles = Array.from({ length: e.items.length }, (_, k) => e.itemStyles?.[k] ?? {});
    return fn(e.items, e.itemStyles);
  });

  const rows = el.items.map((_, i) => {
    const field = textField({ placeholder: `Punkt ${i + 1}`, testId: `point-input-${i}`, maxLength: 160 });
    binder.bind(field, {
      get: (doc) => doc.elements[id]?.items[i] ?? '',
      set: (doc, value) => {
        const items = doc.elements[id]?.items;
        if (!items || i >= items.length) return false;
        items[i] = value;
      },
      key: `points:${id}:${i}`,
    });
    const move = (dir) => update((items, styles) => {
      const j = i + dir;
      if (j < 0 || j >= items.length) return false;
      [items[i], items[j]] = [items[j], items[i]];
      [styles[i], styles[j]] = [styles[j], styles[i]];
    });
    return h('div', { class: 'points-row' },
      field.input,
      button('↑', () => move(-1), { small: true, title: 'W górę', disabled: i === 0 }),
      button('↓', () => move(1), { small: true, title: 'W dół', disabled: i === count - 1 }),
      button('✕', () => update((items, styles) => (items.length <= 1 ? false : void (items.splice(i, 1), styles.splice(i, 1)))), { small: true, title: 'Usuń punkt', disabled: count <= 1 }));
  });

  const add = button('+ Dodaj punkt', () => {
    app.ui.focusAfterRender = `[data-testid="point-input-${count}"]`;
    update((items, styles) => (items.length >= MAX_POINTS ? false : void (items.push(''), styles.push({}))));
  }, { disabled: count >= MAX_POINTS, testId: 'add-point' });

  return [
    ...rows,
    h('div', { class: 'btn-row', style: { marginTop: '6px' } }, add),
    h('p', { class: 'hint' }, `Do ${MAX_POINTS} punktów. Krótkie hasła najlepiej czytają się z daleka.`),
  ];
}

export function qrDataEditor(app, binder, id) {
  const el = app.store.doc.elements[id];
  const kind = selectField({
    label: 'Co ma otwierać kod?',
    options: Object.entries(QR_KINDS).map(([value, label]) => ({ value, label })),
    testId: 'qr-kind',
  });
  binder.bind(kind, elProp(id, 'kind'));

  const fields = QR_FIELDS[el.kind].map((f) => {
    const control = f.type === 'select'
      ? selectField({ label: f.label, options: Object.entries(f.options).map(([value, label]) => ({ value, label })) })
      : textField({
        label: f.label,
        multiline: f.type === 'textarea',
        type: f.type === 'textarea' ? 'text' : f.type,
        placeholder: f.placeholder ?? '',
        testId: `qr-${f.key}`,
        maxLength: 1000,
      });
    const fallback = f.type === 'select' ? Object.keys(f.options)[0] : '';
    binder.bind(control, {
      get: (doc) => doc.elements[id]?.data[f.key] ?? fallback,
      set: (doc, value) => {
        if (!doc.elements[id]) return false;
        doc.elements[id].data[f.key] = String(value);
      },
      key: `qr:${id}:${f.key}`,
    });
    return control.el;
  });

  const error = h('p', { class: 'error-text', 'data-testid': 'qr-error' });
  binder.watch((doc) => {
    const e = doc.elements[id];
    error.textContent = e ? (qrValidationError(e.kind, e.data) ?? '') : '';
  });

  const caption = textField({ label: 'Podpis pod kodem', placeholder: 'np. Zeskanuj mnie', testId: 'qr-caption', maxLength: 60 });
  binder.bind(caption, { ...elProp(id, 'caption'), get: (doc) => doc.elements[id]?.caption ?? '' });

  return [kind.el, ...fields, error, caption.el];
}
