import { describe, it, expect } from 'vitest';
import { BUNDLED_FONTS, SYSTEM_FONTS, fontStyleString, cssFontSpec, allFontFamilies } from '../../src/core/fonts.js';

describe('fonts', () => {
  it('ma 14 wbudowanych czcionek o unikalnych nazwach', () => {
    expect(BUNDLED_FONTS).toHaveLength(14);
    expect(new Set(BUNDLED_FONTS.map((f) => f.family)).size).toBe(14);
  });
  it('fontStyleString', () => {
    expect(fontStyleString({})).toBe('normal');
    expect(fontStyleString({ bold: true })).toBe('bold');
    expect(fontStyleString({ italic: true })).toBe('italic');
    expect(fontStyleString({ bold: true, italic: true })).toBe('italic bold');
  });
  it('cssFontSpec', () => {
    expect(cssFontSpec('Playfair Display', { bold: true, italic: true }, 30)).toBe('italic 700 30px "Playfair Display"');
    expect(cssFontSpec('Inter', {})).toBe('400 40px "Inter"');
  });
  it('allFontFamilies łączy wbudowane i systemowe', () => {
    const all = allFontFamilies();
    expect(all).toContain('Inter');
    expect(all).toContain('Arial');
    expect(all).toHaveLength(BUNDLED_FONTS.length + SYSTEM_FONTS.length);
  });
});
