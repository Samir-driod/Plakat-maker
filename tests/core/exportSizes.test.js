import { describe, it, expect } from 'vitest';
import { exportDims, pdfPage, sanitizeFileName, exportFileName, presentationScale } from '../../src/core/exportSizes.js';

describe('exportDims', () => {
  it('skaluje format', () => {
    expect(exportDims({ w: 1920, h: 1080 }, 2)).toEqual({ width: 3840, height: 2160, pixelRatio: 2 });
    expect(exportDims({ w: 1920, h: 1080 }, 7)).toEqual({ width: 1920, height: 1080, pixelRatio: 1 });
  });
});

describe('pdfPage', () => {
  it('ekranowa strona = rozmiar w pikselach', () => {
    expect(pdfPage({ w: 1080, h: 1920 }, 'screen')).toEqual({ unit: 'px', orientation: 'portrait', pageW: 1080, pageH: 1920, x: 0, y: 0, w: 1080, h: 1920 });
  });
  it('A4 pozioma z marginesem i wyśrodkowaniem', () => {
    const p = pdfPage({ w: 1920, h: 1080 }, 'a4');
    expect(p).toMatchObject({ unit: 'mm', orientation: 'landscape', pageW: 297, pageH: 210 });
    expect(p.w).toBeCloseTo(277);
    expect(p.h).toBeCloseTo(155.81, 1);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo((210 - p.h) / 2);
  });
});

describe('nazwy plików', () => {
  it('usuwa znaki niedozwolone w Windows, zostawia polskie litery', () => {
    expect(sanitizeFileName(' Mój: plakat/2026? ')).toBe('Mój plakat2026');
    expect(sanitizeFileName('...')).toBe('plakat');
    expect(sanitizeFileName('CON')).toBe('CON_');
  });
  it('dodaje orientację i rozszerzenie', () => {
    expect(exportFileName('Promocja', 'portrait', 'png')).toBe('Promocja-pionowo.png');
    expect(exportFileName('', 'landscape', 'pdf')).toBe('plakat-poziomo.pdf');
  });
});

describe('presentationScale', () => {
  it('mieści plakat na ekranie w pikselach fizycznych', () => {
    expect(presentationScale({ w: 1920, h: 1080 }, { width: 2560, height: 1440, scaleFactor: 1.5 })).toBe(2);
    expect(presentationScale({ w: 1080, h: 1920 }, { width: 1920, height: 1080, scaleFactor: 1 })).toBeCloseTo(0.5625);
  });
});
