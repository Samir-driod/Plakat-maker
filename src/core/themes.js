import { layoutPhotoHint } from './layouts.js';

// Same jednolite tła i wzory, bez gradientów i miękkich cieni.
export const THEMES = [
  {
    id: 'nocny', name: 'Nocny',
    palette: { bg: '#1f2a33', bg2: '#2b3a46', accent: '#f2b33d', text: '#f4efe6', muted: '#a3afb8' },
    fonts: { heading: 'Oswald', body: 'Lato' },
    background: { type: 'solid' },
    bullet: 'dash', photo: { shape: 'rect', borderWidth: 0 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'jasny', name: 'Papier',
    palette: { bg: '#faf8f3', bg2: '#ece7dc', accent: '#c8402a', text: '#1b1b1b', muted: '#5d5a54' },
    fonts: { heading: 'Montserrat', body: 'Lora' },
    background: { type: 'solid' },
    bullet: 'number', photo: { shape: 'rect', borderWidth: 0 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'ocean', name: 'Morski',
    palette: { bg: '#0f4c5c', bg2: '#16697a', accent: '#f4d6a0', text: '#ffffff', muted: '#b9dcd8' },
    fonts: { heading: 'Raleway', body: 'Lato' },
    background: { type: 'solid' },
    bullet: 'arrow', photo: { shape: 'circle', borderWidth: 10 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'zachod', name: 'Terakota',
    palette: { bg: '#b8492f', bg2: '#8f3522', accent: '#ffd27a', text: '#fff6ea', muted: '#ffd9c2' },
    fonts: { heading: 'Bebas Neue', body: 'Roboto' },
    background: { type: 'solid' },
    bullet: 'star', photo: { shape: 'arch', borderWidth: 0 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'las', name: 'Las',
    palette: { bg: '#23382c', bg2: '#30503d', accent: '#e8c468', text: '#f1eee2', muted: '#b6c3a6' },
    fonts: { heading: 'Merriweather', body: 'Open Sans' },
    background: { type: 'pattern', pattern: 'diagonal' },
    bullet: 'check', photo: { shape: 'rounded', borderWidth: 8 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'neon', name: 'Riso',
    palette: { bg: '#f2ede1', bg2: '#d8e6f2', accent: '#d6247a', text: '#1d1d1b', muted: '#1f5f99' },
    fonts: { heading: 'Poppins', body: 'Inter' },
    background: { type: 'pattern', pattern: 'dots' },
    bullet: 'arrow', photo: { shape: 'rect', borderWidth: 0 }, qr: { moduleStyle: 'dots' },
  },
  {
    id: 'firmowy', name: 'Firmowy',
    palette: { bg: '#ffffff', bg2: '#e8edef', accent: '#0b5d78', text: '#18222b', muted: '#56636c' },
    fonts: { heading: 'Inter', body: 'Inter' },
    background: { type: 'solid' },
    bullet: 'dash', photo: { shape: 'rect', borderWidth: 0 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'pastel', name: 'Pudrowy',
    palette: { bg: '#f6e6de', bg2: '#dbe5d2', accent: '#a8436a', text: '#3a2d38', muted: '#6c5a66' },
    fonts: { heading: 'Poppins', body: 'Nunito' },
    background: { type: 'pattern', pattern: 'dots' },
    bullet: 'dot', photo: { shape: 'circle', borderWidth: 12 }, qr: { moduleStyle: 'rounded' },
  },
  {
    id: 'elegancki', name: 'Klasyczny',
    palette: { bg: '#f3eee4', bg2: '#e4dccd', accent: '#8b1e1e', text: '#151515', muted: '#5c574e' },
    fonts: { heading: 'Playfair Display', body: 'Merriweather' },
    background: { type: 'solid' },
    bullet: 'dash', photo: { shape: 'rect', borderWidth: 4 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'odreczny', name: 'Odręczny',
    palette: { bg: '#fff7e3', bg2: '#f9e4ad', accent: '#c94a1f', text: '#2b2622', muted: '#6b6158' },
    fonts: { heading: 'Caveat', body: 'Nunito' },
    background: { type: 'pattern', pattern: 'waves' },
    bullet: 'star', photo: { shape: 'rounded', borderWidth: 14 }, qr: { moduleStyle: 'rounded' },
  },
];

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function themePhotoProps(theme) {
  return { shape: theme.photo.shape, borderWidth: theme.photo.borderWidth, shadow: false };
}

export function applyTheme(doc, theme) {
  doc.palette = { ...theme.palette };
  doc.fonts = { ...theme.fonts };
  doc.background.type = theme.background.type;
  if (theme.background.angle !== undefined) doc.background.angle = theme.background.angle;
  if (theme.background.pattern) doc.background.pattern = theme.background.pattern;
  const photoStyle = { ...themePhotoProps(theme), ...(layoutPhotoHint(doc.layoutId) ?? {}) };
  for (const el of Object.values(doc.elements)) {
    if (el.type === 'points') el.bullet = theme.bullet;
    if (el.type === 'qr') el.moduleStyle = theme.qr.moduleStyle;
    if (el.role === 'photo') Object.assign(el, photoStyle);
  }
  doc.themeId = theme.id;
  return doc;
}
