import { newId } from './ids.js';
import { normalizeHex } from './colors.js';

export const DEFAULT_PALETTE = { bg: '#0f172a', bg2: '#1e293b', accent: '#38bdf8', text: '#f8fafc', muted: '#94a3b8' };
export const DEFAULT_FONTS = { heading: 'Montserrat', body: 'Inter' };
export const DEFAULT_BACKGROUND = {
  type: 'linear',
  angle: 135,
  imageId: null,
  blur: 6,
  dim: 0.45,
  pattern: 'dots',
  patternColor: 'palette:accent',
  patternOpacity: 0.12,
  patternSize: 48,
};

export const ELEMENT_DEFAULTS = {
  photo: {
    assetId: null,
    shape: 'rounded',
    radius: 36,
    borderWidth: 0,
    borderColor: 'palette:accent',
    shadow: true,
    crop: { zoom: 1, x: 0.5, y: 0.5 },
    flipX: false,
    filters: { grayscale: 0, sepia: 0, brightness: 100, contrast: 100, saturation: 100, blur: 0 },
  },
  text: {
    text: 'Tekst',
    font: 'body',
    size: 48,
    bold: false,
    italic: false,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.2,
    align: 'left',
    valign: 'top',
    color: 'palette:text',
    shadow: false,
    strokeWidth: 0,
    strokeColor: '#000000',
    autoFit: true,
  },
  points: {
    items: ['Pierwszy ważny punkt', 'Drugi ważny punkt', 'Trzeci ważny punkt', 'Czwarty ważny punkt'],
    bullet: 'dot',
    customBullet: '•',
    bulletColor: 'palette:accent',
    font: 'body',
    size: 44,
    bold: false,
    color: 'palette:text',
    lineHeight: 1.25,
    spacing: 0.6,
    distribute: 'top',
    autoFit: true,
    leadHighlight: true,
    leadBold: true,
    leadColor: 'palette:accent',
    itemStyles: [],
  },
  qr: {
    kind: 'url',
    data: { url: 'https://example.com' },
    fg: '#111111',
    bg: '#ffffff',
    moduleStyle: 'square',
    ecl: 'M',
    margin: 2,
    logoAssetId: null,
    caption: 'Zeskanuj mnie',
    captionColor: '#111111',
    card: true,
    cardRadius: 24,
  },
  image: { assetId: null, opacity: 1, radius: 0, fit: 'contain' },
  shape: { shape: 'rect', fill: 'palette:accent', stroke: 'palette:text', strokeWidth: 0, radius: 0, opacity: 1 },
};

export const ROLE_NAMES = {
  photo: 'Zdjęcie',
  title: 'Tytuł',
  subtitle: 'Podtytuł',
  points: 'Punkty',
  qr: 'Kod QR',
  accent: 'Pasek akcentu',
  panel: 'Panel',
  footer: 'Stopka',
};

export const TYPE_NAMES = { photo: 'Zdjęcie', text: 'Tekst', points: 'Punkty', qr: 'Kod QR', image: 'Obraz', shape: 'Kształt' };

export function createElement(type, role = 'free', overrides = {}) {
  const defaults = ELEMENT_DEFAULTS[type];
  if (!defaults) throw new Error(`Nieznany typ elementu: ${type}`);
  return {
    id: newId(type),
    type,
    role,
    name: ROLE_NAMES[role] ?? TYPE_NAMES[type],
    locked: false,
    ...structuredClone(defaults),
    ...structuredClone(overrides),
  };
}

export function createBaseDocument() {
  const elements = [
    createElement('photo', 'photo'),
    createElement('shape', 'panel', { fill: 'palette:bg', opacity: 0.85, radius: 32 }),
    createElement('shape', 'accent', { fill: 'palette:accent', radius: 6 }),
    createElement('text', 'title', { text: 'Twój tytuł', font: 'heading', size: 110, bold: true, lineHeight: 1.05 }),
    createElement('text', 'subtitle', { text: 'Krótki podtytuł lub hasło', size: 46, color: 'palette:muted' }),
    createElement('points', 'points'),
    createElement('qr', 'qr'),
    createElement('text', 'footer', { text: 'www.twojastrona.pl  ·  +48 123 456 789', size: 30, color: 'palette:muted', valign: 'bottom' }),
  ];
  return {
    version: 1,
    meta: { name: 'Plakat' },
    orientation: 'landscape',
    formatId: '16:9',
    formats: { landscape: { w: 1920, h: 1080 }, portrait: { w: 1080, h: 1920 } },
    themeId: 'nocny',
    layoutId: 'split-left',
    palette: { ...DEFAULT_PALETTE },
    fonts: { ...DEFAULT_FONTS },
    background: { ...DEFAULT_BACKGROUND },
    elements: Object.fromEntries(elements.map((e) => [e.id, e])),
    boxes: { landscape: {}, portrait: {} },
    order: elements.map((e) => e.id),
  };
}

export function resolveColor(doc, value, fallback = '#000000') {
  if (typeof value === 'string' && value.startsWith('palette:')) {
    return normalizeHex(doc.palette?.[value.slice(8)]) ?? fallback;
  }
  return normalizeHex(value) ?? fallback;
}

export function resolveFont(doc, value) {
  if (value === 'heading') return doc.fonts.heading;
  if (value === 'body') return doc.fonts.body;
  return value || doc.fonts.body;
}

export function currentFormat(doc) {
  return doc.formats[doc.orientation];
}

export function getBox(doc, id, orientation = doc.orientation) {
  return doc.boxes[orientation]?.[id] ?? null;
}
