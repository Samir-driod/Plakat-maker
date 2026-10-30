import { layoutPhotoHint } from './layouts.js';

export const THEMES = [
  {
    id: 'nocny', name: 'Nocny',
    palette: { bg: '#0f172a', bg2: '#1e293b', accent: '#38bdf8', text: '#f8fafc', muted: '#94a3b8' },
    fonts: { heading: 'Montserrat', body: 'Inter' },
    background: { type: 'linear', angle: 135 },
    bullet: 'dot', photo: { shape: 'rounded', borderWidth: 0 }, qr: { moduleStyle: 'rounded' },
  },
  {
    id: 'jasny', name: 'Jasny minimal',
    palette: { bg: '#ffffff', bg2: '#f1f5f9', accent: '#2563eb', text: '#0f172a', muted: '#475569' },
    fonts: { heading: 'Inter', body: 'Inter' },
    background: { type: 'solid' },
    bullet: 'check', photo: { shape: 'rect', borderWidth: 0 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'ocean', name: 'Ocean',
    palette: { bg: '#03396c', bg2: '#005b96', accent: '#6dd5ed', text: '#ffffff', muted: '#b3cde0' },
    fonts: { heading: 'Poppins', body: 'Nunito' },
    background: { type: 'radial' },
    bullet: 'arrow', photo: { shape: 'circle', borderWidth: 10 }, qr: { moduleStyle: 'dots' },
  },
  {
    id: 'zachod', name: 'Zachód słońca',
    palette: { bg: '#2d1b3d', bg2: '#c0392b', accent: '#ffb347', text: '#fff7ed', muted: '#fcd5b5' },
    fonts: { heading: 'Bebas Neue', body: 'Lato' },
    background: { type: 'linear', angle: 160 },
    bullet: 'star', photo: { shape: 'arch', borderWidth: 0 }, qr: { moduleStyle: 'rounded' },
  },
  {
    id: 'las', name: 'Las',
    palette: { bg: '#1b3a2b', bg2: '#2f5d46', accent: '#a3d977', text: '#f1f8e9', muted: '#c5e1a5' },
    fonts: { heading: 'Merriweather', body: 'Open Sans' },
    background: { type: 'pattern', pattern: 'diagonal' },
    bullet: 'check', photo: { shape: 'rounded', borderWidth: 8 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'neon', name: 'Neon',
    palette: { bg: '#0a0a0a', bg2: '#1a0033', accent: '#ff2bd6', text: '#ffffff', muted: '#00f0ff' },
    fonts: { heading: 'Oswald', body: 'Roboto' },
    background: { type: 'pattern', pattern: 'grid' },
    bullet: 'arrow', photo: { shape: 'hexagon', borderWidth: 6 }, qr: { moduleStyle: 'dots' },
  },
  {
    id: 'firmowy', name: 'Firmowy',
    palette: { bg: '#f8fafc', bg2: '#e2e8f0', accent: '#0f766e', text: '#1e293b', muted: '#64748b' },
    fonts: { heading: 'Raleway', body: 'Open Sans' },
    background: { type: 'solid' },
    bullet: 'dash', photo: { shape: 'rect', borderWidth: 0 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'pastel', name: 'Pastelowy',
    palette: { bg: '#fdf2f8', bg2: '#e0f2fe', accent: '#db2777', text: '#3b0764', muted: '#7e22ce' },
    fonts: { heading: 'Poppins', body: 'Nunito' },
    background: { type: 'pattern', pattern: 'dots' },
    bullet: 'dot', photo: { shape: 'circle', borderWidth: 12 }, qr: { moduleStyle: 'rounded' },
  },
  {
    id: 'elegancki', name: 'Elegancki',
    palette: { bg: '#111111', bg2: '#2b2b2b', accent: '#d4af37', text: '#f5f5f0', muted: '#bdb6a3' },
    fonts: { heading: 'Playfair Display', body: 'Lora' },
    background: { type: 'radial' },
    bullet: 'dash', photo: { shape: 'arch', borderWidth: 4 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'odreczny', name: 'Odręczny',
    palette: { bg: '#fffbeb', bg2: '#fef3c7', accent: '#ea580c', text: '#292524', muted: '#78716c' },
    fonts: { heading: 'Caveat', body: 'Nunito' },
    background: { type: 'pattern', pattern: 'waves' },
    bullet: 'star', photo: { shape: 'rounded', borderWidth: 14 }, qr: { moduleStyle: 'rounded' },
  },
];

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function themePhotoProps(theme) {
  return { shape: theme.photo.shape, borderWidth: theme.photo.borderWidth, shadow: true };
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
