import { describe, it, expect } from 'vitest';
import {
  normalizeHex, hexToRgb, rgbToHex, rgbToHsl, contrastRatio, readableOn, mix, withAlpha,
  extractPalette, paletteFromImage,
} from '../../src/core/colors.js';

function pixelsOf(...groups) {
  const out = [];
  for (const [hex, count, alpha = 255] of groups) {
    const { r, g, b } = hexToRgb(hex);
    for (let i = 0; i < count; i++) out.push(r, g, b, alpha);
  }
  return new Uint8ClampedArray(out);
}

describe('normalizeHex', () => {
  it('rozwija skrót i zmienia na małe litery', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex(' #FF0000 ')).toBe('#ff0000');
  });
  it('odrzuca błędne wartości', () => {
    expect(normalizeHex('red')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex(42)).toBeNull();
  });
});

describe('konwersje', () => {
  it('hex ↔ rgb', () => {
    expect(hexToRgb('#102030')).toEqual({ r: 16, g: 32, b: 48 });
    expect(rgbToHex({ r: 16, g: 32, b: 48 })).toBe('#102030');
    expect(rgbToHex({ r: 300, g: -5, b: 127.6 })).toBe('#ff0080');
  });
  it('rgb → hsl', () => {
    const red = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(red.h).toBeCloseTo(0);
    expect(red.s).toBeCloseTo(1);
    expect(red.l).toBeCloseTo(0.5);
    expect(rgbToHsl({ r: 128, g: 128, b: 128 }).s).toBe(0);
  });
});

describe('kontrast', () => {
  it('czarny na białym = 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
  });
  it('readableOn wybiera czytelny kolor', () => {
    expect(readableOn('#000000')).toBe('#ffffff');
    expect(readableOn('#ffffff')).toBe('#111111');
  });
});

describe('mix / withAlpha', () => {
  it('miesza kolory', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#ff0000', '#0000ff', 0)).toBe('#ff0000');
    expect(mix('#ff0000', '#0000ff', 1)).toBe('#0000ff');
  });
  it('zwraca rgba', () => {
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)');
  });
});

describe('extractPalette', () => {
  it('zwraca kolory od najczęstszego', () => {
    const px = pixelsOf(['#d02020', 600], ['#2040d0', 300], ['#20c040', 100]);
    const colors = extractPalette(px, { maxColors: 3 });
    expect(colors).toHaveLength(3);
    expect(colors[0]).toBe('#d02020');
    expect(colors[1]).toBe('#2040d0');
  });
  it('pomija przezroczyste piksele i podobne odcienie', () => {
    const px = pixelsOf(['#ffffff', 900, 0], ['#d02020', 120], ['#e02a2a', 100]);
    expect(extractPalette(px)).toEqual(['#d02020']);
  });
  it('pusta tablica → pusta paleta', () => {
    expect(extractPalette(new Uint8ClampedArray(0))).toEqual([]);
  });
});

describe('paletteFromImage', () => {
  it('daje ciemne tło, czytelny tekst i kontrastowy akcent', () => {
    const px = pixelsOf(['#3b5b7a', 500], ['#e0a030', 200], ['#202830', 300]);
    const p = paletteFromImage(px);
    expect(Object.keys(p).sort()).toEqual(['accent', 'bg', 'bg2', 'muted', 'text']);
    expect(contrastRatio(p.text, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.accent, p.bg)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.muted, p.bg)).toBeGreaterThanOrEqual(3);
  });
  it('zwraca null dla obrazu bez widocznych pikseli', () => {
    expect(paletteFromImage(pixelsOf(['#ffffff', 10, 0]))).toBeNull();
  });
});
