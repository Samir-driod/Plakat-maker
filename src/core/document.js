import { FORMAT_PRESETS, ORIENTATIONS, MIN_FORMAT, MAX_FORMAT, MIN_BOX } from './constants.js';
import { createBaseDocument } from './model.js';
import { applyLayout, applyBottomOrder, computeLayout, layoutPhotoHint } from './layouts.js';
import { applyTheme, getTheme, themePhotoProps } from './themes.js';

export const STARTERS = [
  { id: 'start-nocny', name: 'Nocny, zdjęcie z lewej', themeId: 'nocny', layoutId: 'split-left' },
  { id: 'start-jasny', name: 'Papier, zdjęcie z prawej', themeId: 'jasny', layoutId: 'split-right' },
  { id: 'start-ocean', name: 'Morski, karta', themeId: 'ocean', layoutId: 'card' },
  { id: 'start-zachod', name: 'Terakota, zdjęcie w tle', themeId: 'zachod', layoutId: 'full-photo' },
  { id: 'start-las', name: 'Las, pół na pół', themeId: 'las', layoutId: 'sidebar' },
  { id: 'start-neon', name: 'Riso, baner', themeId: 'neon', layoutId: 'photo-top' },
  { id: 'start-firmowy', name: 'Firmowy, zdjęcie z lewej', themeId: 'firmowy', layoutId: 'split-left' },
  { id: 'start-elegancki', name: 'Klasyczny, karta', themeId: 'elegancki', layoutId: 'card' },
];

export function setFormat(doc, formatId, custom = null) {
  let next;
  let id = formatId;
  if (formatId === 'custom') {
    const clamp = (v) => Math.min(MAX_FORMAT, Math.max(MIN_FORMAT, Math.round(Number(v) || 0)));
    const a = clamp(custom?.w ?? 1920);
    const b = clamp(custom?.h ?? 1080);
    next = {
      landscape: { w: Math.max(a, b), h: Math.min(a, b) },
      portrait: { w: Math.min(a, b), h: Math.max(a, b) },
    };
  } else {
    const preset = FORMAT_PRESETS.find((p) => p.id === formatId) ?? FORMAT_PRESETS[0];
    next = { landscape: { ...preset.landscape }, portrait: { ...preset.portrait } };
    id = preset.id;
  }
  for (const o of ORIENTATIONS) {
    const old = doc.formats[o];
    const sx = next[o].w / old.w;
    const sy = next[o].h / old.h;
    for (const b of Object.values(doc.boxes[o])) {
      b.x = Math.round(b.x * sx);
      b.y = Math.round(b.y * sy);
      b.w = Math.max(MIN_BOX, Math.round(b.w * sx));
      b.h = Math.max(MIN_BOX, Math.round(b.h * sy));
    }
    doc.formats[o] = next[o];
  }
  doc.formatId = id;
  return doc;
}

function photoStyleFor(doc) {
  return { ...themePhotoProps(getTheme(doc.themeId)), ...(layoutPhotoHint(doc.layoutId) ?? {}) };
}

export function chooseLayout(doc, layoutId) {
  applyLayout(doc, layoutId);
  const style = photoStyleFor(doc);
  for (const el of Object.values(doc.elements)) if (el.role === 'photo') Object.assign(el, style);
  return doc;
}

export function newDocument({ themeId = 'nocny', layoutId = 'split-left', formatId = '16:9', orientation = 'landscape', custom = null } = {}) {
  const doc = createBaseDocument();
  setFormat(doc, formatId, custom);
  doc.orientation = orientation === 'portrait' ? 'portrait' : 'landscape';
  doc.layoutId = layoutId;
  applyTheme(doc, getTheme(themeId));
  chooseLayout(doc, layoutId);
  return doc;
}

export function findByRole(doc, role) {
  for (const id of doc.order) if (doc.elements[id]?.role === role) return doc.elements[id];
  return null;
}

export function restoreRole(doc, role) {
  const existing = findByRole(doc, role);
  if (existing) return existing.id;
  const template = Object.values(createBaseDocument().elements).find((e) => e.role === role);
  if (!template) throw new Error(`Nie można odtworzyć roli: ${role}`);
  const el = structuredClone(template);
  if (role === 'photo') Object.assign(el, photoStyleFor(doc));
  if (role === 'points') el.bullet = getTheme(doc.themeId).bullet;
  if (role === 'qr') el.moduleStyle = getTheme(doc.themeId).qr.moduleStyle;
  doc.elements[el.id] = el;
  doc.order.push(el.id);
  applyBottomOrder(doc);
  for (const o of ORIENTATIONS) {
    const b = computeLayout(doc.layoutId, doc.formats[o], o)[role];
    doc.boxes[o][el.id] = { ...b, hidden: false };
  }
  return el.id;
}
