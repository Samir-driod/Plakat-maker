import { h } from '../dom.js';
import {
  textField, slider, numberField, selectField, toggleField, segmented, colorField, button, section,
} from '../controls.js';
import { elProp, visibilityToggle, pointsEditor, qrDataEditor } from './common.js';
import { fontOptions } from '../fontOptions.js';
import {
  PHOTO_SHAPES, SHAPE_KINDS, BULLETS, QR_MODULE_STYLES, QR_ECL, TEXT_ALIGN, TEXT_VALIGN, MIN_BOX,
} from '../../core/constants.js';
import { TYPE_NAMES, resolveColor } from '../../core/model.js';
import { contrastRatio, relativeLuminance } from '../../core/colors.js';
import { renameElement } from '../../core/elementOps.js';
import { ITEM_SCALE } from '../../core/richPoints.js';

export const FILTER_PRESETS = [
  { name: 'Oryginał', filters: { grayscale: 0, sepia: 0, brightness: 100, contrast: 100, saturation: 100, blur: 0 } },
  { name: 'Czarno-białe', filters: { grayscale: 100, sepia: 0, brightness: 105, contrast: 115, saturation: 100, blur: 0 } },
  { name: 'Vintage', filters: { grayscale: 0, sepia: 45, brightness: 105, contrast: 90, saturation: 80, blur: 0 } },
  { name: 'Żywe', filters: { grayscale: 0, sepia: 0, brightness: 105, contrast: 115, saturation: 140, blur: 0 } },
  { name: 'Miękkie', filters: { grayscale: 0, sepia: 10, brightness: 110, contrast: 85, saturation: 90, blur: 1 } },
];

const options = (map) => Object.entries(map).map(([value, label]) => ({ value, label: typeof label === 'string' ? label : label.label }));
const nested = (id, obj, key) => ({
  get: (doc) => doc.elements[id]?.[obj]?.[key],
  set: (doc, value) => {
    const el = doc.elements[id];
    if (!el) return false;
    el[obj][key] = value;
  },
  key: `el:${id}:${obj}.${key}`,
});
const boxProp = (id, key) => ({
  get: (doc) => doc.boxes[doc.orientation][id]?.[key],
  set: (doc, value) => {
    const b = doc.boxes[doc.orientation][id];
    if (!b) return false;
    b[key] = key === 'w' || key === 'h' ? Math.max(MIN_BOX, value) : value;
  },
  key: `box:${id}:${key}`,
});

function bindAll(binder, pairs) {
  for (const [control, spec] of pairs) binder.bind(control, spec);
  return pairs.map(([control]) => control.el);
}

// --- Sekcje wspólne ----------------------------------------------------------------

function headerSection(app, binder, el) {
  const name = textField({ label: `Nazwa (${TYPE_NAMES[el.type]})`, maxLength: 80, testId: 'el-name' });
  binder.bind(name, {
    get: (doc) => doc.elements[el.id]?.name ?? '',
    set: (doc, value) => renameElement(doc, el.id, value) || false,
    key: `el:${el.id}:name`,
  });
  return name.el;
}

function geometrySection(app, binder, el) {
  const x = numberField({ label: 'X', testId: 'el-x' });
  const y = numberField({ label: 'Y', testId: 'el-y' });
  const w = numberField({ label: 'Szer.', min: MIN_BOX, testId: 'el-w' });
  const hh = numberField({ label: 'Wys.', min: MIN_BOX, testId: 'el-h' });
  const rot = slider({ label: 'Obrót', min: -180, max: 180, step: 1, unit: '°' });
  bindAll(binder, [[x, boxProp(el.id, 'x')], [y, boxProp(el.id, 'y')], [w, boxProp(el.id, 'w')], [hh, boxProp(el.id, 'h')], [rot, boxProp(el.id, 'rotation')]]);
  return section('Położenie i rozmiar', [
    h('div', { class: 'four-col' }, x.el, y.el, w.el, hh.el),
    rot.el,
    h('div', { class: 'btn-row' },
      button('⇔ Środek poziomo', () => app.actions.alignSelection('hcenter'), { small: true }),
      button('⇕ Środek pionowo', () => app.actions.alignSelection('vcenter'), { small: true })),
  ], { open: false });
}

function arrangeSection(app, binder, el) {
  const locked = toggleField({ label: 'Zablokuj (nie da się przesunąć)', testId: 'el-locked' });
  binder.bind(locked, elProp(el.id, 'locked'));
  return section('Warstwa i akcje', [
    h('div', { class: 'btn-row' },
      button('Na wierzch', () => app.actions.reorderSelection('front'), { small: true }),
      button('Wyżej', () => app.actions.reorderSelection('forward'), { small: true }),
      button('Niżej', () => app.actions.reorderSelection('backward'), { small: true }),
      button('Na spód', () => app.actions.reorderSelection('back'), { small: true })),
    locked.el,
    visibilityToggle(binder, el.id),
    h('div', { class: 'btn-row' },
      button('Duplikuj (Ctrl+D)', () => app.actions.duplicateSelection(), { small: true }),
      button('Usuń (Delete)', () => app.actions.deleteSelection(), { small: true, kind: 'danger', testId: 'el-delete' })),
  ]);
}

function textStyleControls(app, binder, el, { withContent }) {
  const id = el.id;
  const parts = [];
  if (withContent) {
    const text = textField({ label: 'Treść', multiline: true, rows: 3, testId: 'el-text', maxLength: 400 });
    binder.bind(text, { ...elProp(id, 'text'), get: (doc) => doc.elements[id]?.text ?? '' });
    parts.push(text.el);
  }
  const font = selectField({ label: 'Czcionka', options: fontOptions(app.store.doc), testId: 'el-font' });
  const size = slider({ label: el.autoFit ? 'Rozmiar maksymalny' : 'Rozmiar', min: 8, max: 300, step: 1, unit: ' px', testId: 'el-size' });
  const autoFit = toggleField({ label: 'Dopasuj rozmiar do ramki', testId: 'el-autofit' });
  const bold = toggleField({ label: 'Pogrubienie' });
  const italic = toggleField({ label: 'Kursywa' });
  const upper = toggleField({ label: 'WIELKIE LITERY' });
  const align = segmented({ label: 'Wyrównanie', options: [{ value: 'left', label: '⟸', title: TEXT_ALIGN.left }, { value: 'center', label: '≡', title: TEXT_ALIGN.center }, { value: 'right', label: '⟹', title: TEXT_ALIGN.right }] });
  const valign = segmented({ label: 'W pionie', options: options(TEXT_VALIGN) });
  const color = colorField({ label: 'Kolor tekstu', settings: app.settings, testId: 'el-color' });
  const spacing = slider({ label: 'Odstęp liter', min: -5, max: 40, step: 0.5, unit: ' px' });
  const line = slider({ label: 'Interlinia', min: 0.8, max: 2, step: 0.05, format: (v) => v.toFixed(2) });
  const shadow = toggleField({ label: 'Cień pod tekstem' });
  const stroke = slider({ label: 'Obrys', min: 0, max: 12, step: 0.5, unit: ' px' });
  const strokeColor = colorField({ label: 'Kolor obrysu', settings: app.settings });
  bindAll(binder, [
    [font, elProp(id, 'font')], [size, elProp(id, 'size')], [autoFit, elProp(id, 'autoFit')], [bold, elProp(id, 'bold')],
    [italic, elProp(id, 'italic')], [upper, elProp(id, 'uppercase')], [align, elProp(id, 'align')], [valign, elProp(id, 'valign')],
    [color, elProp(id, 'color')], [spacing, elProp(id, 'letterSpacing')], [line, elProp(id, 'lineHeight')],
    [shadow, elProp(id, 'shadow')], [stroke, elProp(id, 'strokeWidth')], [strokeColor, elProp(id, 'strokeColor')],
  ]);
  return section('Tekst', [
    ...parts, font.el, size.el, autoFit.el,
    h('div', { class: 'two-col' }, bold.el, italic.el), upper.el,
    align.el, valign.el, color.el, spacing.el, line.el, shadow.el, stroke.el, strokeColor.el,
  ]);
}

// --- Sekcje typów --------------------------------------------------------------------

function pointsSections(app, binder, el) {
  const id = el.id;
  const bullet = selectField({ label: 'Znacznik', options: options(BULLETS), testId: 'el-bullet' });
  const bulletColor = colorField({ label: 'Kolor znacznika', settings: app.settings });
  const font = selectField({ label: 'Czcionka', options: fontOptions(app.store.doc) });
  const size = slider({ label: el.autoFit ? 'Rozmiar maksymalny' : 'Rozmiar', min: 8, max: 200, step: 1, unit: ' px' });
  const autoFit = toggleField({ label: 'Dopasuj rozmiar do ramki' });
  const bold = toggleField({ label: 'Pogrubienie' });
  const color = colorField({ label: 'Kolor tekstu', settings: app.settings });
  const spacing = slider({ label: 'Odstęp między punktami', min: 0, max: 2, step: 0.05, format: (v) => v.toFixed(2) });
  const line = slider({ label: 'Interlinia', min: 0.8, max: 2, step: 0.05, format: (v) => v.toFixed(2) });
  const distribute = segmented({ label: 'Rozmieszczenie', options: [{ value: 'top', label: 'Od góry' }, { value: 'spread', label: 'Równomiernie' }] });
  const style = [
    bullet.el,
    ...(el.bullet === 'custom' ? bindAll(binder, [[textField({ label: 'Własny znak (np. emoji)', maxLength: 4 }), elProp(id, 'customBullet')]]) : []),
    ...bindAll(binder, [
      [bulletColor, elProp(id, 'bulletColor')], [font, elProp(id, 'font')], [size, elProp(id, 'size')], [autoFit, elProp(id, 'autoFit')],
      [bold, elProp(id, 'bold')], [color, elProp(id, 'color')], [spacing, elProp(id, 'spacing')], [line, elProp(id, 'lineHeight')],
      [distribute, elProp(id, 'distribute')],
    ]),
  ];
  binder.bind(bullet, elProp(id, 'bullet'));
  const lead = [
    h('p', { class: 'hint' }, 'Tekst przed myślnikiem lub dwukropkiem, np. „Hasło - opis”, dostaje osobny wygląd.'),
    ...bindAll(binder, [
      [toggleField({ label: 'Wyróżnij hasło przed myślnikiem', testId: 'el-lead' }), elProp(id, 'leadHighlight')],
      ...(el.leadHighlight ? [
        [toggleField({ label: 'Pogrubienie hasła' }), elProp(id, 'leadBold')],
        [colorField({ label: 'Kolor hasła', settings: app.settings }), elProp(id, 'leadColor')],
      ] : []),
    ]),
  ];
  return [
    section('Punkty', pointsEditor(app, binder, id)),
    section('Wygląd punktów', style),
    section('Wyróżnienie hasła', lead),
    section('Każdy punkt osobno', el.items.map((_, i) => itemStyleSection(app, binder, el, i)), { open: false }),
  ];
}

// Nadpisanie stylu jednego punktu; pusta wartość = ustawienie całego elementu.
function itemProp(id, i, key, fallback = (e) => e[key]) {
  return {
    get: (doc) => {
      const e = doc.elements[id];
      return e?.itemStyles?.[i]?.[key] ?? (e ? fallback(e) : undefined);
    },
    set: (doc, value) => {
      const e = doc.elements[id];
      if (!e || i >= e.items.length) return false;
      e.itemStyles = Array.from({ length: e.items.length }, (_, k) => e.itemStyles?.[k] ?? {});
      if (value === null || value === '') delete e.itemStyles[i][key];
      else e.itemStyles[i][key] = value;
    },
    key: `item:${id}:${i}:${key}`,
  };
}

function itemStyleSection(app, binder, el, i) {
  const id = el.id;
  const boldProp = itemProp(id, i, 'bold');
  const bold = segmented({ label: 'Pogrubienie', options: [{ value: 'inherit', label: 'Jak reszta' }, { value: 'on', label: 'Tak' }, { value: 'off', label: 'Nie' }] });
  binder.bind(bold, {
    get: (doc) => {
      const v = doc.elements[id]?.itemStyles?.[i]?.bold;
      return v === true ? 'on' : v === false ? 'off' : 'inherit';
    },
    set: (doc, v) => boldProp.set(doc, v === 'inherit' ? null : v === 'on'),
    key: boldProp.key,
  });
  const scale = slider({ label: 'Wielkość względem reszty', min: ITEM_SCALE.min, max: ITEM_SCALE.max, step: 0.05, format: (v) => `${Math.round(v * 100)}%` });
  const scaleProp = itemProp(id, i, 'scale', () => 1);
  binder.bind(scale, { ...scaleProp, set: (doc, v) => scaleProp.set(doc, v === 1 ? null : v) });
  const reset = button('Przywróć wygląd jak reszta', () => app.store.update((doc) => {
    const e = doc.elements[id];
    if (!e?.itemStyles?.[i] || !Object.keys(e.itemStyles[i]).length) return false;
    e.itemStyles[i] = {};
  }), { small: true });
  return section(`Punkt ${i + 1}`, [
    ...bindAll(binder, [
      [textField({ label: 'Własny znacznik (puste = jak reszta)', maxLength: 4 }), itemProp(id, i, 'bullet', () => '')],
      [colorField({ label: 'Kolor znacznika', settings: app.settings }), itemProp(id, i, 'bulletColor')],
      [colorField({ label: 'Kolor tekstu', settings: app.settings }), itemProp(id, i, 'color')],
      ...(el.leadHighlight ? [[colorField({ label: 'Kolor hasła', settings: app.settings }), itemProp(id, i, 'leadColor')]] : []),
    ]),
    bold.el, scale.el, reset,
  ], { open: false });
}

function photoSections(app, binder, el) {
  const id = el.id;
  const hasImage = !!app.store.getAsset(el.assetId);
  const shape = selectField({ label: 'Kształt', options: options(PHOTO_SHAPES), testId: 'el-photo-shape' });
  const radius = slider({ label: 'Zaokrąglenie rogów', min: 0, max: 300, step: 2, unit: ' px' });
  const border = slider({ label: 'Ramka', min: 0, max: 40, step: 1, unit: ' px' });
  const borderColor = colorField({ label: 'Kolor ramki', settings: app.settings });
  const shadow = toggleField({ label: 'Cień' });
  const flip = toggleField({ label: 'Odbicie lustrzane' });
  const zoom = slider({ label: 'Przybliżenie', min: 1, max: 5, step: 0.01, format: (v) => `${v.toFixed(2)}×` });
  const cx = slider({ label: 'Kadr w poziomie', min: 0, max: 1, step: 0.01, format: (v) => Math.round(v * 100), unit: '%' });
  const cy = slider({ label: 'Kadr w pionie', min: 0, max: 1, step: 0.01, format: (v) => Math.round(v * 100), unit: '%' });
  const filterSliders = [
    ['grayscale', 'Czarno-biel', 0, 100], ['sepia', 'Sepia', 0, 100], ['brightness', 'Jasność', 50, 150],
    ['contrast', 'Kontrast', 50, 150], ['saturation', 'Nasycenie', 0, 200], ['blur', 'Rozmycie', 0, 20],
  ].map(([key, label, min, max]) => {
    const s = slider({ label, min, max, step: 1, unit: key === 'blur' ? '' : '%' });
    binder.bind(s, nested(id, 'filters', key));
    return s.el;
  });
  const shapeEls = bindAll(binder, [
    [shape, elProp(id, 'shape')], [border, elProp(id, 'borderWidth')], [borderColor, elProp(id, 'borderColor')],
    [shadow, elProp(id, 'shadow')], [flip, elProp(id, 'flipX')],
  ]);
  if (el.shape === 'rounded') {
    binder.bind(radius, elProp(id, 'radius'));
    shapeEls.splice(1, 0, radius.el);
  }
  const cropEls = bindAll(binder, [[zoom, nested(id, 'crop', 'zoom')], [cx, nested(id, 'crop', 'x')], [cy, nested(id, 'crop', 'y')]]);
  return [
    section('Zdjęcie', [
      h('div', { class: 'btn-row' },
        button(hasImage ? 'Zmień zdjęcie' : 'Wybierz zdjęcie', () => app.actions.pickPhoto(id), { kind: 'primary' }),
        hasImage ? button('Kadruj myszą', () => app.actions.enterCrop(id)) : null,
        hasImage ? button('Usuń', () => app.actions.removeImage(id), { kind: 'ghost' }) : null),
      ...shapeEls,
    ]),
    section('Kadr', [
      ...cropEls,
      button('Wyśrodkuj kadr', () => app.store.update((d) => { d.elements[id].crop = { zoom: 1, x: 0.5, y: 0.5 }; }), { small: true }),
    ], { open: false }),
    section('Filtry', [
      h('div', { class: 'btn-row' }, FILTER_PRESETS.map((p) =>
        button(p.name, () => app.store.update((d) => { d.elements[id].filters = { ...p.filters }; }), { small: true }))),
      ...filterSliders,
    ], { open: false }),
  ];
}

function qrSections(app, binder, el) {
  const id = el.id;
  const fg = colorField({ label: 'Kolor kodu', settings: app.settings, testId: 'el-qr-fg' });
  const bg = colorField({ label: 'Tło kodu', settings: app.settings });
  const style = segmented({ label: 'Styl modułów', options: options(QR_MODULE_STYLES) });
  const ecl = selectField({ label: 'Odporność na uszkodzenia', options: options(QR_ECL) });
  const margin = slider({ label: 'Margines (moduły)', min: 0, max: 6, step: 1 });
  const captionColor = colorField({ label: 'Kolor podpisu', settings: app.settings });
  const card = toggleField({ label: 'Biała karta pod kodem' });
  const cardRadius = slider({ label: 'Zaokrąglenie karty', min: 0, max: 80, step: 1, unit: ' px' });
  const warn = h('div');
  binder.watch((doc) => {
    const e = doc.elements[id];
    if (!e) return;
    const f = resolveColor(doc, e.fg, '#111111');
    const b = resolveColor(doc, e.bg, '#ffffff');
    const msgs = [];
    if (contrastRatio(f, b) < 3) msgs.push('⚠ Za mały kontrast — kod może się nie skanować.');
    else if (relativeLuminance(f) > relativeLuminance(b)) msgs.push('⚠ Jasny kod na ciemnym tle nie działa w części telefonów.');
    if (e.logoAssetId) msgs.push('Logo w środku wymusza najwyższą odporność (30%).');
    warn.replaceChildren(...msgs.map((m) => h('p', { class: m.startsWith('⚠') ? 'warning' : 'hint' }, m)));
  });
  const looks = bindAll(binder, [
    [fg, elProp(id, 'fg')], [bg, elProp(id, 'bg')], [style, elProp(id, 'moduleStyle')], [ecl, elProp(id, 'ecl')],
    [margin, elProp(id, 'margin')], [card, elProp(id, 'card')], [cardRadius, elProp(id, 'cardRadius')], [captionColor, elProp(id, 'captionColor')],
  ]);
  return [
    section('Kod QR — treść', qrDataEditor(app, binder, id)),
    section('Kod QR — wygląd', [
      ...looks,
      warn,
      h('div', { class: 'btn-row' },
        button(el.logoAssetId ? 'Zmień logo' : 'Dodaj logo w środku', () => app.actions.pickQrLogo(id), { small: true }),
        el.logoAssetId ? button('Usuń logo', () => app.actions.removeImage(id), { small: true, kind: 'ghost' }) : null),
    ]),
  ];
}

function imageSections(app, binder, el) {
  const id = el.id;
  const fit = segmented({ label: 'Dopasowanie', options: [{ value: 'contain', label: 'Cały obraz' }, { value: 'cover', label: 'Wypełnij' }] });
  const opacity = slider({ label: 'Przezroczystość', min: 0.05, max: 1, step: 0.05, format: (v) => Math.round(v * 100), unit: '%' });
  const radius = slider({ label: 'Zaokrąglenie', min: 0, max: 200, step: 1, unit: ' px' });
  return [section('Obraz', [
    h('div', { class: 'btn-row' },
      button(el.assetId ? 'Zmień obraz' : 'Wybierz obraz', () => app.actions.pickPhoto(id), { kind: 'primary' }),
      el.assetId ? button('Usuń obraz', () => app.actions.removeImage(id), { kind: 'ghost' }) : null),
    ...bindAll(binder, [[fit, elProp(id, 'fit')], [opacity, elProp(id, 'opacity')], [radius, elProp(id, 'radius')]]),
  ])];
}

function shapeSections(app, binder, el) {
  const id = el.id;
  const kind = segmented({ label: 'Kształt', options: options(SHAPE_KINDS) });
  const fill = colorField({ label: el.shape === 'line' ? 'Kolor linii' : 'Wypełnienie', settings: app.settings });
  const opacity = slider({ label: 'Przezroczystość', min: 0.05, max: 1, step: 0.05, format: (v) => Math.round(v * 100), unit: '%' });
  const pairs = [[kind, elProp(id, 'shape')], [fill, elProp(id, 'fill')], [opacity, elProp(id, 'opacity')]];
  if (el.shape !== 'line') {
    pairs.push(
      [colorField({ label: 'Kolor obrysu', settings: app.settings }), elProp(id, 'stroke')],
      [slider({ label: 'Grubość obrysu', min: 0, max: 30, step: 1, unit: ' px' }), elProp(id, 'strokeWidth')],
    );
  }
  if (el.shape === 'rect') pairs.push([slider({ label: 'Zaokrąglenie', min: 0, max: 300, step: 1, unit: ' px' }), elProp(id, 'radius')]);
  const parts = bindAll(binder, pairs);
  if (el.shape === 'line') parts.push(h('p', { class: 'hint' }, 'Grubość linii zmienisz górnym lub dolnym uchwytem.'));
  return [section('Kształt', parts)];
}

const TYPE_SECTIONS = {
  text: (app, binder, el) => [textStyleControls(app, binder, el, { withContent: true })],
  points: pointsSections,
  photo: photoSections,
  qr: qrSections,
  image: imageSections,
  shape: shapeSections,
};

// --- Widoki panelu ------------------------------------------------------------------

function emptyView(app) {
  return section('Nic nie zaznaczono', [
    h('p', { class: 'hint' }, 'Kliknij element na plakacie, aby zmienić jego wygląd. Shift+klik lub ramka zaznaczenia = kilka elementów.'),
    h('div', { class: 'btn-row' },
      button('+ Tekst', () => app.actions.addText(), { small: true }),
      button('+ Obraz', () => app.actions.addImageElement(), { small: true }),
      button('+ Kształt', () => app.actions.addShape('rect'), { small: true }),
      button('+ QR', () => app.actions.addQr(), { small: true })),
  ]);
}

function multiView(app, count) {
  const align = (mode, label) => button(label, () => app.actions.alignSelection(mode), { small: true });
  return [
    section(`Zaznaczone elementy: ${count}`, [
      h('div', { class: 'field-label' }, 'Wyrównaj'),
      h('div', { class: 'btn-row' }, align('left', '⇤ Lewo'), align('hcenter', '↔ Środek'), align('right', '⇥ Prawo')),
      h('div', { class: 'btn-row', style: { marginTop: '6px' } }, align('top', '⤒ Góra'), align('vcenter', '↕ Środek'), align('bottom', '⤓ Dół')),
      h('div', { class: 'field-label', style: { marginTop: '10px' } }, 'Rozłóż równomiernie'),
      h('div', { class: 'btn-row' },
        button('W poziomie', () => app.actions.distributeSelection('h'), { small: true }),
        button('W pionie', () => app.actions.distributeSelection('v'), { small: true })),
    ]),
    section('Akcje', [h('div', { class: 'btn-row' },
      button('Na wierzch', () => app.actions.reorderSelection('front'), { small: true }),
      button('Na spód', () => app.actions.reorderSelection('back'), { small: true }),
      button('Zablokuj / odblokuj', () => app.actions.toggleLockSelection(), { small: true }),
      button('Ukryj / pokaż', () => app.actions.toggleHiddenSelection(), { small: true }),
      button('Duplikuj', () => app.actions.duplicateSelection(), { small: true }),
      button('Usuń', () => app.actions.deleteSelection(), { small: true, kind: 'danger' }))]),
  ];
}

export const elementPanel = {
  id: 'element',
  label: 'Element',
  key(doc, selection) {
    const ids = selection.ids.filter((id) => doc.elements[id]);
    if (ids.length !== 1) return `n:${ids.join(',')}`;
    const el = doc.elements[ids[0]];
    const extra = {
      text: '',
      points: `${el.bullet}:${el.items?.length}:${el.autoFit}:${el.leadHighlight}`,
      photo: `${el.assetId}:${el.shape}`,
      qr: `${el.kind}:${el.logoAssetId}`,
      image: `${el.assetId}`,
      shape: `${el.shape}`,
    }[el.type];
    return `1:${el.id}:${el.type}:${el.autoFit}:${extra}`;
  },
  render(root, { app, binder }) {
    const doc = app.store.doc;
    const ids = app.selection.ids.filter((id) => doc.elements[id]);
    if (!ids.length) {
      root.append(emptyView(app));
      return;
    }
    if (ids.length > 1) {
      root.append(...multiView(app, ids.length));
      return;
    }
    const el = doc.elements[ids[0]];
    root.append(
      headerSection(app, binder, el),
      ...TYPE_SECTIONS[el.type](app, binder, el),
      geometrySection(app, binder, el),
      arrangeSection(app, binder, el),
    );
  },
};
