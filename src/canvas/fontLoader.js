import { BUNDLED_FONTS, FONT_SAMPLE, cssFontSpec } from '../core/fonts.js';
import { resolveFont } from '../core/model.js';

const loaded = new Set();
const keyOf = (family, bold, italic) => `${family}|${bold ? 1 : 0}|${italic ? 1 : 0}`;

function loadFace(family, bold, italic) {
  const key = keyOf(family, bold, italic);
  if (loaded.has(key)) return Promise.resolve();
  return document.fonts
    .load(cssFontSpec(family, { bold, italic }, 40), FONT_SAMPLE)
    .catch(() => [])
    .then(() => {
      loaded.add(key);
    });
}

export async function preloadBundledFonts() {
  const jobs = [];
  for (const f of BUNDLED_FONTS) {
    for (const bold of f.bold ? [false, true] : [false]) {
      for (const italic of f.italic ? [false, true] : [false]) jobs.push(loadFace(f.family, bold, italic));
    }
  }
  await Promise.allSettled(jobs);
}

export function ensureFontsForDoc(doc, onLoaded) {
  const pending = [];
  for (const el of Object.values(doc.elements)) {
    if (el.type !== 'text' && el.type !== 'points') continue;
    const family = resolveFont(doc, el.font);
    if (!loaded.has(keyOf(family, el.bold, el.italic))) pending.push(loadFace(family, el.bold, el.italic));
  }
  if (pending.length) Promise.allSettled(pending).then(onLoaded);
}
