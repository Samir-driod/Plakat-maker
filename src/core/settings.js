import { normalizeHex } from './colors.js';

export const DEFAULT_SETTINGS = {
  recent: [],
  lastProjectDir: '',
  lastExportDir: '',
  exportFormat: 'png',
  exportScale: 1,
  exportOrientation: 'current',
  pdfMode: 'screen',
  jpgQuality: 0.92,
  showSafeArea: false,
  showGrid: false,
  gridSize: 40,
  snap: true,
  autosave: true,
  showWelcome: true,
  recentColors: [],
};

const ENUMS = {
  exportFormat: ['png', 'jpg', 'pdf'],
  exportOrientation: ['current', 'landscape', 'portrait', 'both'],
  pdfMode: ['screen', 'a4'],
};

const RANGES = { exportScale: [1, 3], jpgQuality: [0.5, 1], gridSize: [10, 400] };

export function mergeSettings(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = structuredClone(DEFAULT_SETTINGS);
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    const v = src[key];
    if (v === undefined) continue;
    if (Array.isArray(def)) {
      if (Array.isArray(v)) out[key] = v.filter((x) => typeof x === 'string').slice(0, 20);
    } else if (ENUMS[key]) {
      if (ENUMS[key].includes(v)) out[key] = v;
    } else if (typeof def === 'number') {
      const [min, max] = RANGES[key] ?? [-Infinity, Infinity];
      if (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max) out[key] = v;
    } else if (typeof v === typeof def) {
      out[key] = v;
    }
  }
  return out;
}

export function addRecentColor(list, value, max = 12) {
  const hex = normalizeHex(value);
  if (!hex) return list;
  return [hex, ...list.filter((c) => c !== hex)].slice(0, max);
}
