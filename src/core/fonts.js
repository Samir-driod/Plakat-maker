export const BUNDLED_FONTS = [
  { family: 'Inter', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Montserrat', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Poppins', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Roboto', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Open Sans', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Lato', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Nunito', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Raleway', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Oswald', category: 'Nagłówkowe', bold: true, italic: false },
  { family: 'Bebas Neue', category: 'Nagłówkowe', bold: false, italic: false },
  { family: 'Playfair Display', category: 'Szeryfowe', bold: true, italic: true },
  { family: 'Merriweather', category: 'Szeryfowe', bold: true, italic: true },
  { family: 'Lora', category: 'Szeryfowe', bold: true, italic: true },
  { family: 'Caveat', category: 'Odręczne', bold: true, italic: false },
];

export const SYSTEM_FONTS = ['Arial', 'Segoe UI', 'Calibri', 'Georgia', 'Verdana', 'Impact', 'Times New Roman'];

export const FONT_SAMPLE = 'AaĄąĆćĘęŁłŃńÓóŚśŹźŻż0123';

export function fontStyleString({ bold = false, italic = false } = {}) {
  if (bold && italic) return 'italic bold';
  if (bold) return 'bold';
  if (italic) return 'italic';
  return 'normal';
}

export function cssFontSpec(family, { bold = false, italic = false } = {}, size = 40) {
  return `${italic ? 'italic ' : ''}${bold ? 700 : 400} ${size}px "${family}"`;
}

export function allFontFamilies() {
  return [...BUNDLED_FONTS.map((f) => f.family), ...SYSTEM_FONTS];
}
