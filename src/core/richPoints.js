import { normalizeHex } from './colors.js';
import { PALETTE_KEYS } from './constants.js';

export const ITEM_SCALE = { min: 0.5, max: 2 };

// „Hasło - opis” / „Hasło: opis” → { lead: 'Hasło', rest: ' - opis' }. Bez separatora: lead = ''.
export function splitLead(text) {
  const m = /^(.+?)(\s[-–—]\s|:\s)/.exec(text);
  if (!m || !m[1].trim()) return { lead: '', rest: text };
  const lead = m[2].startsWith(':') ? `${m[1]}:` : m[1];
  return { lead, rest: text.slice(lead.length) };
}

// Zawija ciąg fragmentów o różnych stylach do szerokości maxWidth.
// runs: [{ text, style }], measure(text, style) → szerokość. Zwraca linie fragmentów z pozycją x.
// Łamie tylko na zwykłych spacjach; kawałki różnych stylów bez spacji między nimi (i twarda spacja) trzymają się razem.
export function wrapRuns(runs, maxWidth, measure) {
  const words = [];
  let word = null;
  let space = null;
  for (const run of runs) {
    for (const part of run.text.split(/([ \t\n]+)/)) {
      if (!part) continue;
      if (/^[ \t\n]+$/.test(part)) {
        space = { text: part, style: run.style };
        word = null;
      } else if (word) {
        word.pieces.push({ text: part, style: run.style });
      } else {
        word = { space, pieces: [{ text: part, style: run.style }] };
        words.push(word);
        space = null;
      }
    }
  }

  const lines = [];
  let line = [];
  let x = 0;
  const push = (text, style) => {
    const last = line[line.length - 1];
    if (last && last.style === style) {
      last.text += text;
      last.width = measure(last.text, style);
      x = last.x + last.width;
    } else {
      const width = measure(text, style);
      line.push({ text, style, x, width });
      x += width;
    }
  };
  for (const w of words) {
    const width = w.pieces.reduce((sum, p) => sum + measure(p.text, p.style), 0);
    const gap = line.length && w.space ? measure(w.space.text, w.space.style) : 0;
    if (line.length && x + gap + width > maxWidth + 0.5) {
      lines.push(line);
      line = [];
      x = 0;
    } else if (line.length && w.space) {
      push(w.space.text, w.space.style);
    }
    for (const p of w.pieces) push(p.text, p.style);
  }
  lines.push(line);
  return lines;
}

const COLOR_KEYS = ['color', 'bulletColor', 'leadColor'];

function colorValue(v) {
  if (typeof v === 'string' && v.startsWith('palette:')) return PALETTE_KEYS.includes(v.slice(8)) ? v : null;
  return normalizeHex(v);
}

// Nadpisania stylu pojedynczego punktu; brak klucza = ustawienie całego elementu.
export function normalizeItemStyle(raw) {
  const out = {};
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const key of COLOR_KEYS) {
    const c = colorValue(raw[key]);
    if (c) out[key] = c;
  }
  if (typeof raw.bullet === 'string' && raw.bullet.trim()) out.bullet = raw.bullet.slice(0, 4);
  if (typeof raw.bold === 'boolean') out.bold = raw.bold;
  if (typeof raw.scale === 'number' && Number.isFinite(raw.scale)) {
    out.scale = Math.min(ITEM_SCALE.max, Math.max(ITEM_SCALE.min, raw.scale));
  }
  return out;
}

// Lista może być krótsza niż punkty — brakujące pozycje = brak nadpisań.
export function normalizeItemStyles(raw, count) {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, count).map(normalizeItemStyle);
}
