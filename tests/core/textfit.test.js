import { describe, it, expect } from 'vitest';
import { fitFontSize, layoutPoints, fitPoints } from '../../src/core/textfit.js';

describe('fitFontSize', () => {
  const measure = (s) => ({ width: 100, height: s * 2 });
  it('zwraca maksimum, gdy mieści się', () => {
    expect(fitFontSize(measure, { maxSize: 20, boxHeight: 50 })).toBe(20);
  });
  it('zmniejsza do największego pasującego', () => {
    expect(fitFontSize(measure, { maxSize: 100, boxHeight: 50 })).toBe(25);
  });
  it('nie schodzi poniżej minimum', () => {
    expect(fitFontSize(measure, { maxSize: 100, minSize: 8, boxHeight: 4 })).toBe(8);
  });
  it('bierze pod uwagę szerokość', () => {
    const m = (s) => ({ width: s * 10, height: s });
    expect(fitFontSize(m, { maxSize: 100, boxWidth: 300, boxHeight: 1000 })).toBe(30);
  });
  it('symulacja zawijania: więcej linii przy większym rozmiarze', () => {
    const wrap = (s) => {
      const lines = Math.ceil((40 * s * 0.5) / 400);
      return { width: 400, height: lines * s * 1.2 };
    };
    const size = fitFontSize(wrap, { maxSize: 120, boxHeight: 150 });
    expect(wrap(size).height).toBeLessThanOrEqual(150.5);
    expect(wrap(size + 1).height).toBeGreaterThan(150);
  });
});

describe('layoutPoints', () => {
  it('od góry ze stałym odstępem', () => {
    expect(layoutPoints([10, 20, 10], { gap: 5 })).toEqual({ ys: [0, 15, 40], total: 50 });
  });
  it('rozkłada równomiernie na wysokość ramki', () => {
    expect(layoutPoints([10, 10, 10], { gap: 5, boxHeight: 90, distribute: 'spread' })).toEqual({ ys: [0, 40, 80], total: 90 });
  });
  it('spread nie ściska poniżej zwykłego odstępu', () => {
    expect(layoutPoints([10, 10], { gap: 5, boxHeight: 12, distribute: 'spread' }).ys).toEqual([0, 15]);
  });
  it('pusta lista', () => {
    expect(layoutPoints([], { gap: 5 })).toEqual({ ys: [], total: 0 });
  });
});

describe('fitPoints', () => {
  it('dobiera rozmiar tak, by wszystkie punkty i odstępy się zmieściły', () => {
    const measureItem = (_i, s) => s * 1.2;
    const size = fitPoints(measureItem, 4, { maxSize: 100, spacing: 0.5, boxHeight: 300 });
    const total = (s) => 4 * s * 1.2 + 3 * s * 0.5;
    expect(total(size)).toBeLessThanOrEqual(300.5);
    expect(total(size + 1)).toBeGreaterThan(300);
  });
});
