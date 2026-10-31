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
export function wrapRuns(runs, maxWidth, measure) {
  const tokens = [];
  for (const run of runs) {
    for (const part of run.text.split(/(\s+)/)) {
      if (part) tokens.push({ text: part, style: run.style, space: /^\s+$/.test(part) });
    }
  }
  const lines = [];
  let line = [];
  let x = 0;
  const pushFrag = (text, style) => {
    const last = line[line.length - 1];
    const width = measure(text, style);
    if (last && last.style === style) {
      last.text += text;
      last.width = measure(last.text, style);
      x = last.x + last.width;
    } else {
      line.push({ text, style, x, width });
      x += width;
    }
  };
  const breakLine = () => {
    while (line.length && /^\s*$/.test(line[line.length - 1].text)) line.pop();
    const lastFrag = line[line.length - 1];
    if (lastFrag && /\s$/.test(lastFrag.text)) {
      lastFrag.text = lastFrag.text.trimEnd();
      lastFrag.width = measure(lastFrag.text, lastFrag.style);
    }
    lines.push(line);
    line = [];
    x = 0;
  };
  for (const t of tokens) {
    if (t.space) {
      if (line.length) pushFrag(t.text, t.style);
      continue;
    }
    const w = measure(t.text, t.style);
    if (line.length && x + w > maxWidth + 0.5) breakLine();
    pushFrag(t.text, t.style);
  }
  if (line.length || !lines.length) breakLine();
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
