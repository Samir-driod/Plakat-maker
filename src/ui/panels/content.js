import { h } from '../dom.js';
import { textField, button, section } from '../controls.js';
import { findByRole } from '../../core/document.js';
import { visibilityToggle, restoreBox, pointsEditor, qrDataEditor, elProp } from './common.js';

function photoSection(app, binder) {
  const el = findByRole(app.store.doc, 'photo');
  if (!el) return section('Zdjęcie', [restoreBox(app, 'photo', 'Zdjęcie')]);
  const asset = app.store.getAsset(el.assetId);
  const preview = asset
    ? h('img', { class: 'thumb', src: asset.dataUrl, alt: 'Podgląd zdjęcia' })
    : h('div', { class: 'thumb', style: { display: 'flex', alignItems: 'center', justifyContent: 'center' } }, h('span', { class: 'hint' }, 'Brak zdjęcia'));
  return section('Zdjęcie', [
    preview,
    h('div', { class: 'btn-row', style: { marginTop: '8px' } },
      button(asset ? 'Zmień zdjęcie' : 'Wybierz zdjęcie', () => app.actions.pickPhoto(el.id), { kind: 'primary', testId: 'pick-photo' }),
      asset ? button('Kadruj', () => app.actions.enterCrop(el.id)) : null,
      asset ? button('Usuń', () => app.actions.removeImage(el.id), { kind: 'ghost' }) : null),
    h('p', { class: 'hint' }, 'Możesz też przeciągnąć plik na plakat albo wkleić obraz (Ctrl+V). Dwuklik na zdjęciu = kadrowanie.'),
    visibilityToggle(binder, el.id),
  ]);
}

function textSection(app, binder, role, title, { testId, placeholder, rows = 2 }) {
  const el = findByRole(app.store.doc, role);
  if (!el) return section(title, [restoreBox(app, role, title)]);
  const field = textField({ multiline: true, rows, testId, placeholder, maxLength: 400 });
  binder.bind(field, { ...elProp(el.id, 'text'), get: (doc) => doc.elements[el.id]?.text ?? '' });
  return section(title, [field.el, visibilityToggle(binder, el.id)]);
}

function pointsSection(app, binder) {
  const el = findByRole(app.store.doc, 'points');
  if (!el) return section('Punkty', [restoreBox(app, 'points', 'Punkty')]);
  return section('Punkty', [
    ...pointsEditor(app, binder, el.id),
    h('p', { class: 'hint' }, 'Wygląd punktów (znaczniki, kolory, czcionka) ustawisz w zakładce „Element”.'),
    visibilityToggle(binder, el.id),
  ]);
}

function qrSection(app, binder) {
  const el = findByRole(app.store.doc, 'qr');
  if (!el) return section('Kod QR', [restoreBox(app, 'qr', 'Kod QR')]);
  return section('Kod QR', [
    ...qrDataEditor(app, binder, el.id),
    h('p', { class: 'hint' }, 'Kolory, styl modułów i logo w środku ustawisz w zakładce „Element”.'),
    visibilityToggle(binder, el.id),
  ]);
}

function projectNameSection(binder) {
  const name = textField({ label: 'Nazwa projektu (używana w nazwach plików)', testId: 'project-name', maxLength: 120 });
  binder.bind(name, {
    get: (doc) => doc.meta.name,
    set: (doc, value) => {
      doc.meta.name = value.trim() ? value : 'Plakat';
    },
    key: 'meta:name',
  });
  return name.el;
}

export const contentPanel = {
  id: 'content',
  label: 'Treść',
  key(doc) {
    return ['photo', 'title', 'subtitle', 'points', 'qr', 'footer'].map((role) => {
      const e = findByRole(doc, role);
      if (!e) return `${role}:-`;
      if (role === 'points') return `${role}:${e.id}:${e.items.length}`;
      if (role === 'qr') return `${role}:${e.id}:${e.kind}`;
      if (role === 'photo') return `${role}:${e.id}:${e.assetId}`;
      return `${role}:${e.id}`;
    }).join('|');
  },
  render(root, { app, binder }) {
    root.append(
      projectNameSection(binder),
      photoSection(app, binder),
      textSection(app, binder, 'title', 'Tytuł', { testId: 'title-input', placeholder: 'Główne hasło plakatu' }),
      textSection(app, binder, 'subtitle', 'Podtytuł', { testId: 'subtitle-input', placeholder: 'Krótkie uzupełnienie' }),
      pointsSection(app, binder),
      qrSection(app, binder),
      textSection(app, binder, 'footer', 'Stopka', { testId: 'footer-input', placeholder: 'Kontakt, adres, strona www', rows: 1 }),
    );
  },
};
