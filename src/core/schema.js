import {
  SCHEMA_VERSION, APP_ID, ORIENTATIONS, PALETTE_KEYS, MAX_POINTS, MIN_BOX, MIN_FORMAT, MAX_FORMAT,
  FORMAT_PRESETS, ELEMENT_TYPES, ROLES, BACKGROUND_TYPES, PATTERNS, PHOTO_SHAPES, SHAPE_KINDS, BULLETS,
  QR_MODULE_STYLES, QR_ECL, TEXT_ALIGN, TEXT_VALIGN,
} from './constants.js';
import {
  ELEMENT_DEFAULTS, DEFAULT_PALETTE, DEFAULT_FONTS, DEFAULT_BACKGROUND, ROLE_NAMES, TYPE_NAMES,
} from './model.js';
import { normalizeHex } from './colors.js';
import { normalizeItemStyles } from './richPoints.js';

export class ProjectError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProjectError';
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const text = (v, fallback, max = 120) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : fallback);

const ENUMS = {
  photo: { shape: Object.keys(PHOTO_SHAPES) },
  text: { align: Object.keys(TEXT_ALIGN), valign: Object.keys(TEXT_VALIGN) },
  points: { bullet: Object.keys(BULLETS), distribute: ['top', 'spread'] },
  qr: {
    kind: ['url', 'text', 'wifi', 'email', 'phone', 'vcard'],
    moduleStyle: Object.keys(QR_MODULE_STYLES),
    ecl: Object.keys(QR_ECL),
  },
  image: { fit: ['contain', 'cover'] },
  shape: { shape: Object.keys(SHAPE_KINDS) },
};

const COLOR_FIELDS = {
  photo: ['borderColor'],
  text: ['color', 'strokeColor'],
  points: ['bulletColor', 'color', 'leadColor'],
  qr: ['fg', 'bg', 'captionColor'],
  image: [],
  shape: ['fill', 'stroke'],
};

// Kolejne wersje schematu: MIGRATIONS[n] zamienia obiekt w wersji n na wersję n + 1.
const MIGRATIONS = {};

export function mergeWithDefaults(defaults, value) {
  const src = isPlainObject(value) ? value : {};
  const out = {};
  for (const [key, def] of Object.entries(defaults)) {
    const v = src[key];
    if (key === 'data' && isPlainObject(def)) {
      out[key] = isPlainObject(v)
        ? Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'string'))
        : structuredClone(def);
    } else if (isPlainObject(def)) {
      out[key] = mergeWithDefaults(def, v);
    } else if (Array.isArray(def)) {
      out[key] = Array.isArray(v) ? structuredClone(v) : structuredClone(def);
    } else if (def === null) {
      out[key] = typeof v === 'string' ? v : null;
    } else if (typeof def === 'number') {
      out[key] = finite(v, def);
    } else {
      out[key] = typeof v === typeof def ? v : def;
    }
  }
  return out;
}

export function normalizeColorValue(value) {
  if (typeof value === 'string' && value.startsWith('palette:')) {
    return PALETTE_KEYS.includes(value.slice(8)) ? value : null;
  }
  return normalizeHex(value);
}

function normalizeElement(id, raw, warnings) {
  if (!isPlainObject(raw) || !ELEMENT_TYPES.includes(raw.type)) {
    warnings.push(`Pominięto nieznany element (${raw?.type ?? 'brak typu'}).`);
    return null;
  }
  const type = raw.type;
  const role = ROLES.includes(raw.role) ? raw.role : 'free';
  const defaults = ELEMENT_DEFAULTS[type];
  const el = {
    id,
    type,
    role,
    name: text(raw.name, ROLE_NAMES[role] ?? TYPE_NAMES[type], 80),
    locked: raw.locked === true,
    ...mergeWithDefaults(defaults, raw),
  };
  for (const [key, allowed] of Object.entries(ENUMS[type])) {
    if (!allowed.includes(el[key])) el[key] = defaults[key];
  }
  for (const key of COLOR_FIELDS[type]) {
    el[key] = normalizeColorValue(el[key]) ?? defaults[key];
  }
  if (type === 'points') {
    el.items = el.items.filter((x) => typeof x === 'string').slice(0, MAX_POINTS);
    if (!el.items.length) el.items = [''];
    el.itemStyles = normalizeItemStyles(el.itemStyles, el.items.length);
  }
  return el;
}

function normalizeFormat(raw, fallback) {
  const ok = (v) => Number.isInteger(v) && v >= MIN_FORMAT && v <= MAX_FORMAT;
  return isPlainObject(raw) && ok(raw.w) && ok(raw.h) ? { w: raw.w, h: raw.h } : { ...fallback };
}

function defaultBox(format) {
  return {
    x: Math.round(format.w * 0.3),
    y: Math.round(format.h * 0.4),
    w: Math.round(format.w * 0.4),
    h: Math.round(format.h * 0.2),
    rotation: 0,
    hidden: false,
  };
}

function normalizeBox(raw) {
  if (!isPlainObject(raw)) return null;
  return {
    x: finite(raw.x, 0),
    y: finite(raw.y, 0),
    w: Math.max(MIN_BOX, finite(raw.w, MIN_BOX)),
    h: Math.max(MIN_BOX, finite(raw.h, MIN_BOX)),
    rotation: finite(raw.rotation, 0),
    hidden: raw.hidden === true,
  };
}

export function normalizeDocument(raw, warnings = []) {
  if (!isPlainObject(raw)) throw new ProjectError('Plik nie zawiera dokumentu plakatu.');

  const elements = {};
  for (const [id, el] of Object.entries(isPlainObject(raw.elements) ? raw.elements : {})) {
    if (id === '__proto__') {
      warnings.push('Pominięto element o nieprawidłowym identyfikatorze.');
      continue;
    }
    const normalized = normalizeElement(id, el, warnings);
    if (normalized) elements[id] = normalized;
  }
  const ids = Object.keys(elements);

  const order = [...new Set((Array.isArray(raw.order) ? raw.order : [])
    .filter((id) => typeof id === 'string' && Object.hasOwn(elements, id)))];
  for (const id of ids) if (!order.includes(id)) order.push(id);

  const formats = {};
  for (const o of ORIENTATIONS) formats[o] = normalizeFormat(raw.formats?.[o], FORMAT_PRESETS[0][o]);

  let missingBoxes = false;
  const boxes = {};
  for (const o of ORIENTATIONS) {
    boxes[o] = {};
    const src = isPlainObject(raw.boxes?.[o]) ? raw.boxes[o] : {};
    for (const id of ids) {
      const box = normalizeBox(src[id]);
      if (!box) missingBoxes = true;
      boxes[o][id] = box ?? defaultBox(formats[o]);
    }
  }
  if (missingBoxes) warnings.push('Niektóre elementy nie miały pozycji, więc ustawiono je na środku plakatu.');

  const palette = {};
  for (const k of PALETTE_KEYS) palette[k] = normalizeHex(raw.palette?.[k]) ?? DEFAULT_PALETTE[k];

  const background = mergeWithDefaults(DEFAULT_BACKGROUND, raw.background);
  if (!Object.hasOwn(BACKGROUND_TYPES, background.type)) background.type = DEFAULT_BACKGROUND.type;
  if (!Object.hasOwn(PATTERNS, background.pattern)) background.pattern = DEFAULT_BACKGROUND.pattern;
  background.patternColor = normalizeColorValue(background.patternColor) ?? DEFAULT_BACKGROUND.patternColor;

  return {
    version: SCHEMA_VERSION,
    meta: { name: text(raw.meta?.name, 'Plakat') },
    orientation: ORIENTATIONS.includes(raw.orientation) ? raw.orientation : 'landscape',
    formatId: text(raw.formatId, '16:9', 20),
    formats,
    themeId: text(raw.themeId, 'nocny', 60),
    layoutId: text(raw.layoutId, 'split-left', 60),
    palette,
    fonts: { heading: text(raw.fonts?.heading, DEFAULT_FONTS.heading, 60), body: text(raw.fonts?.body, DEFAULT_FONTS.body, 60) },
    background,
    elements,
    boxes,
    order,
  };
}

export function collectAssetIds(doc) {
  const ids = new Set();
  for (const el of Object.values(doc.elements)) {
    if ((el.type === 'photo' || el.type === 'image') && el.assetId) ids.add(el.assetId);
    if (el.type === 'qr' && el.logoAssetId) ids.add(el.logoAssetId);
  }
  if (doc.background?.imageId) ids.add(doc.background.imageId);
  return ids;
}

function normalizeAssets(raw, warnings) {
  const out = {};
  for (const [id, a] of Object.entries(isPlainObject(raw) ? raw : {})) {
    if (id === '__proto__') {
      warnings.push('Pominięto obraz o nieprawidłowym identyfikatorze.');
    } else if (isPlainObject(a) && typeof a.dataUrl === 'string' && a.dataUrl.startsWith('data:image/')) {
      out[id] = { dataUrl: a.dataUrl, w: finite(a.w, 0), h: finite(a.h, 0), name: text(a.name, 'obraz') };
    } else {
      warnings.push('Pominięto uszkodzony obraz zapisany w projekcie.');
    }
  }
  return out;
}

function dropMissingAssetRefs(doc, assets, warnings) {
  const missing = () => warnings.push('Brakuje obrazu użytego w projekcie, usunięto odwołanie.');
  for (const el of Object.values(doc.elements)) {
    if ((el.type === 'photo' || el.type === 'image') && el.assetId && !Object.hasOwn(assets, el.assetId)) {
      el.assetId = null;
      missing();
    }
    if (el.type === 'qr' && el.logoAssetId && !Object.hasOwn(assets, el.logoAssetId)) {
      el.logoAssetId = null;
      missing();
    }
  }
  if (doc.background.imageId && !Object.hasOwn(assets, doc.background.imageId)) {
    doc.background.imageId = null;
    missing();
  }
}

export function projectToObject(doc, assets) {
  const used = collectAssetIds(doc);
  const usedAssets = {};
  for (const id of used) if (Object.hasOwn(assets, id)) usedAssets[id] = assets[id];
  return { app: APP_ID, version: SCHEMA_VERSION, doc, assets: usedAssets };
}

function migrate(obj) {
  let version = obj.version;
  if (!Number.isInteger(version) || version < 1) throw new ProjectError('Nieznana wersja pliku projektu.');
  if (version > SCHEMA_VERSION) {
    throw new ProjectError('Projekt został zapisany w nowszej wersji programu. Zaktualizuj Plakat Maker.');
  }
  let current = obj;
  while (version < SCHEMA_VERSION) {
    current = MIGRATIONS[version](current);
    version++;
  }
  return current;
}

export function projectFromObject(obj) {
  if (!isPlainObject(obj) || obj.app !== APP_ID) throw new ProjectError('Ten plik nie jest plikiem projektu Plakat Maker.');
  const migrated = migrate(obj);
  const warnings = [];
  const doc = normalizeDocument(migrated.doc, warnings);
  const assets = normalizeAssets(migrated.assets, warnings);
  dropMissingAssetRefs(doc, assets, warnings);
  return { doc, assets, warnings };
}

export function serializeProject(doc, assets) {
  return JSON.stringify(projectToObject(doc, assets));
}

export function parseProject(textContent) {
  let obj;
  try {
    obj = JSON.parse(textContent);
  } catch {
    throw new ProjectError('Plik projektu jest uszkodzony (niepoprawny format).');
  }
  return projectFromObject(obj);
}
