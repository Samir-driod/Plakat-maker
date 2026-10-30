import { describe, it, expect } from 'vitest';
import { THEMES, getTheme, applyTheme } from '../../src/core/themes.js';
import { BUNDLED_FONTS } from '../../src/core/fonts.js';
import { contrastRatio } from '../../src/core/colors.js';
import { createBaseDocument } from '../../src/core/model.js';
import { PALETTE_KEYS, BACKGROUND_TYPES, PATTERNS, BULLETS, PHOTO_SHAPES, QR_MODULE_STYLES } from '../../src/core/constants.js';

const families = BUNDLED_FONTS.map((f) => f.family);

describe('THEMES', () => {
  it('10 motywów o unikalnych id', () => {
    expect(THEMES).toHaveLength(10);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(10);
  });
  for (const t of THEMES) {
    it(`${t.name}: poprawne dane i czytelne kolory`, () => {
      expect(Object.keys(t.palette).sort()).toEqual([...PALETTE_KEYS].sort());
      expect(contrastRatio(t.palette.text, t.palette.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.palette.accent, t.palette.bg)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(t.palette.muted, t.palette.bg)).toBeGreaterThanOrEqual(3);
      expect(families).toContain(t.fonts.heading);
      expect(families).toContain(t.fonts.body);
      expect(BACKGROUND_TYPES).toHaveProperty(t.background.type);
      if (t.background.pattern) expect(PATTERNS).toHaveProperty(t.background.pattern);
      expect(BULLETS).toHaveProperty(t.bullet);
      expect(PHOTO_SHAPES).toHaveProperty(t.photo.shape);
      expect(QR_MODULE_STYLES).toHaveProperty(t.qr.moduleStyle);
    });
  }
});

describe('applyTheme', () => {
  it('ustawia paletę, czcionki, tło i style elementów', () => {
    const doc = createBaseDocument();
    const ocean = getTheme('ocean');
    applyTheme(doc, ocean);
    expect(doc.palette).toEqual(ocean.palette);
    expect(doc.fonts).toEqual(ocean.fonts);
    expect(doc.background.type).toBe(ocean.background.type);
    expect(doc.themeId).toBe('ocean');
    const els = Object.values(doc.elements);
    expect(els.find((e) => e.type === 'points').bullet).toBe(ocean.bullet);
    expect(els.find((e) => e.type === 'qr').moduleStyle).toBe(ocean.qr.moduleStyle);
    expect(els.find((e) => e.role === 'photo').shape).toBe(ocean.photo.shape);
  });
  it('nie zmienia kształtu zdjęcia wymuszonego przez układ', () => {
    const doc = createBaseDocument();
    doc.layoutId = 'full-photo';
    const photo = Object.values(doc.elements).find((e) => e.role === 'photo');
    photo.shape = 'rect';
    applyTheme(doc, getTheme('ocean'));
    expect(photo.shape).toBe('rect');
  });
  it('nie kopiuje referencji palety motywu', () => {
    const doc = createBaseDocument();
    applyTheme(doc, getTheme('las'));
    doc.palette.bg = '#000000';
    expect(getTheme('las').palette.bg).not.toBe('#000000');
  });
  it('getTheme zwraca pierwszy motyw dla nieznanego id', () => {
    expect(getTheme('nie-ma')).toBe(THEMES[0]);
  });
});
