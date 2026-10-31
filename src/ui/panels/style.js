import { h } from '../dom.js';
import { colorField, selectField, slider, segmented, button, section } from '../controls.js';
import { fontOptions } from '../fontOptions.js';
import { THEMES, applyTheme } from '../../core/themes.js';
import { PALETTE_KEYS, PALETTE_LABELS, BACKGROUND_TYPES, PATTERNS } from '../../core/constants.js';
import { contrastRatio, paletteFromImage } from '../../core/colors.js';
import { findByRole } from '../../core/document.js';
import { toast } from '../dialogs.js';

const SHORT_BG = { solid: 'Kolor', linear: 'Gradient', radial: 'Radialny', image: 'Zdjęcie', pattern: 'Wzór' };

const bgProp = (key) => ({
  get: (doc) => doc.background[key],
  set: (doc, value) => {
    doc.background[key] = value;
  },
  key: `bg:${key}`,
});

export async function paletteFromPhoto(app) {
  const photo = findByRole(app.store.doc, 'photo');
  const asset = app.store.getAsset(photo?.assetId);
  if (!asset) {
    toast('Najpierw dodaj zdjęcie, z niego weźmiemy kolory.');
    return;
  }
  const img = new Image();
  img.src = asset.dataUrl;
  await img.decode();
  const s = 96 / Math.max(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * s));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * s));
  const c2d = canvas.getContext('2d', { willReadFrequently: true });
  c2d.drawImage(img, 0, 0, canvas.width, canvas.height);
  const palette = paletteFromImage(c2d.getImageData(0, 0, canvas.width, canvas.height).data);
  if (!palette) {
    toast('Nie udało się odczytać kolorów ze zdjęcia.', { type: 'error' });
    return;
  }
  app.store.update((doc) => {
    doc.palette = palette;
    doc.themeId = 'custom';
  });
  toast('Dopasowano kolory do zdjęcia. Ctrl+Z przywraca poprzednie.', { type: 'success' });
}

function themesSection(app, binder) {
  const cards = THEMES.map((theme) => {
    const p = theme.palette;
    return h('div', {
      class: 'card',
      'data-theme': theme.id,
      'data-testid': `theme-${theme.id}`,
      title: `${theme.fonts.heading} + ${theme.fonts.body}`,
      onClick: () => app.store.update((doc) => {
        applyTheme(doc, theme);
      }),
    },
    h('div', { class: 'card-preview', style: { background: p.bg } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        h('span', { style: { fontFamily: `"${theme.fonts.heading}"`, fontWeight: '700', fontSize: '24px', color: p.text } }, 'Aa'),
        h('span', { style: { width: '28px', height: '6px', background: p.accent } }))),
    h('div', { class: 'card-name' }, theme.name));
  });
  binder.watch((doc) => {
    for (const card of cards) card.classList.toggle('active', card.dataset.theme === doc.themeId);
  });
  return section('Motyw', [
    h('div', { class: 'card-grid' }, cards),
    h('p', { class: 'hint' }, 'Motyw zmienia kolory, czcionki, tło i styl elementów. Treść i położenie zostają bez zmian.'),
  ]);
}

function paletteSection(app, binder) {
  const fields = PALETTE_KEYS.map((k) => {
    const field = colorField({ label: PALETTE_LABELS[k], settings: app.settings, allowPalette: false, testId: `palette-${k}` });
    binder.bind(field, {
      get: (doc) => doc.palette[k],
      set: (doc, value) => {
        if (!value?.startsWith('#')) return false;
        doc.palette[k] = value;
        doc.themeId = 'custom';
      },
      key: `palette:${k}`,
    });
    return field.el;
  });
  const warnings = h('div');
  binder.watch((doc) => {
    const p = doc.palette;
    const msgs = [];
    const text = contrastRatio(p.text, p.bg);
    const accent = contrastRatio(p.accent, p.bg);
    if (text < 4.5) msgs.push(`⚠ Słaby kontrast tekstu z tłem (${text.toFixed(1)}:1, zalecane co najmniej 4.5:1).`);
    if (accent < 3) msgs.push(`⚠ Akcent słabo odcina się od tła (${accent.toFixed(1)}:1).`);
    warnings.replaceChildren(...msgs.map((m) => h('p', { class: 'warning' }, m)));
  });
  return section('Kolory', [
    h('div', { class: 'two-col' }, fields),
    warnings,
    h('div', { class: 'btn-row' },
      button('🎨 Kolory ze zdjęcia', () => paletteFromPhoto(app), { testId: 'palette-from-photo', title: 'Dobierz paletę do Twojego zdjęcia' })),
    h('p', { class: 'hint' }, 'Elementy korzystające z kolorów motywu zmienią się automatycznie.'),
  ]);
}

function fontsSection(binder) {
  const heading = selectField({ label: 'Czcionka nagłówków', options: fontOptions(), testId: 'font-heading' });
  const body = selectField({ label: 'Czcionka tekstu', options: fontOptions(), testId: 'font-body' });
  binder.bind(heading, { get: (doc) => doc.fonts.heading, set: (doc, v) => { doc.fonts.heading = v; } });
  binder.bind(body, { get: (doc) => doc.fonts.body, set: (doc, v) => { doc.fonts.body = v; } });
  return section('Czcionki', [heading.el, body.el, h('p', { class: 'hint' }, 'Wszystkie wbudowane czcionki mają polskie znaki i działają bez internetu.')]);
}

function backgroundSection(app, binder) {
  const doc = app.store.doc;
  const type = segmented({
    label: 'Rodzaj tła',
    options: Object.entries(BACKGROUND_TYPES).map(([value, label]) => ({ value, label: SHORT_BG[value], title: label })),
    testId: 'bg-type',
  });
  binder.bind(type, bgProp('type'));
  const parts = [type.el];
  const t = doc.background.type;

  if (t === 'linear') {
    const angle = slider({ label: 'Kąt gradientu', min: 0, max: 360, step: 5, unit: '°' });
    binder.bind(angle, bgProp('angle'));
    parts.push(angle.el, h('p', { class: 'hint' }, 'Gradient przechodzi od koloru „Tło” do „Tło 2”.'));
  }
  if (t === 'radial') parts.push(h('p', { class: 'hint' }, 'Środek w kolorze „Tło 2”, brzegi w kolorze „Tło”.'));
  if (t === 'image') {
    const photo = findByRole(doc, 'photo');
    parts.push(h('div', { class: 'btn-row' },
      button('Wybierz obraz tła', () => app.actions.pickBackgroundImage(), { kind: 'primary' }),
      photo?.assetId ? button('Użyj zdjęcia z plakatu', () => app.store.update((d) => { d.background.imageId = photo.assetId; })) : null));
    if (!doc.background.imageId) parts.push(h('p', { class: 'hint' }, 'Brak obrazu, widać kolor „Tło”.'));
    const blur = slider({ label: 'Rozmycie', min: 0, max: 40, step: 1 });
    const dim = slider({ label: 'Przyciemnienie', min: 0, max: 0.9, step: 0.05, format: (v) => Math.round(v * 100), unit: '%' });
    binder.bind(blur, bgProp('blur'));
    binder.bind(dim, bgProp('dim'));
    parts.push(blur.el, dim.el);
  }
  if (t === 'pattern') {
    const pattern = selectField({ label: 'Wzór', options: Object.entries(PATTERNS).map(([value, label]) => ({ value, label })) });
    const size = slider({ label: 'Wielkość wzoru', min: 16, max: 200, step: 2, unit: ' px' });
    const opacity = slider({ label: 'Widoczność wzoru', min: 0.02, max: 0.6, step: 0.02, format: (v) => Math.round(v * 100), unit: '%' });
    const color = colorField({ label: 'Kolor wzoru', settings: app.settings });
    binder.bind(pattern, bgProp('pattern'));
    binder.bind(size, bgProp('patternSize'));
    binder.bind(opacity, bgProp('patternOpacity'));
    binder.bind(color, bgProp('patternColor'));
    parts.push(pattern.el, size.el, opacity.el, color.el);
  }
  return section('Tło', parts);
}

export const stylePanel = {
  id: 'style',
  label: 'Wygląd',
  key(doc) {
    const photo = findByRole(doc, 'photo');
    return `${doc.background.type}|${doc.background.imageId}|${photo?.assetId ?? ''}`;
  },
  render(root, { app, binder }) {
    root.append(themesSection(app, binder), paletteSection(app, binder), fontsSection(binder), backgroundSection(app, binder));
  },
};
