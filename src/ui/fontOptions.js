import { BUNDLED_FONTS, SYSTEM_FONTS } from '../core/fonts.js';

export function fontOptions(doc = null) {
  const options = [];
  if (doc) {
    options.push(
      { value: 'heading', label: `Nagłówkowa z motywu (${doc.fonts.heading})`, group: 'Z motywu' },
      { value: 'body', label: `Tekstowa z motywu (${doc.fonts.body})`, group: 'Z motywu' },
    );
  }
  for (const f of BUNDLED_FONTS) options.push({ value: f.family, label: f.family, group: f.category, style: `font-family: "${f.family}"` });
  for (const f of SYSTEM_FONTS) options.push({ value: f, label: f, group: 'Systemowe (Windows)', style: `font-family: "${f}"` });
  return options;
}
