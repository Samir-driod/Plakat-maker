import { describe, it, expect } from 'vitest';
import { snapTargets, computeSnap } from '../../src/core/snapping.js';

const format = { w: 1000, h: 500 };

describe('snapTargets', () => {
  it('zawiera krawędzie, środek, obszar bezpieczny i ramki innych', () => {
    const t = snapTargets([{ x: 100, y: 50, w: 200, h: 100 }], format, { safeArea: 0.1 });
    expect(t.xs).toEqual(expect.arrayContaining([0, 500, 1000, 100, 900, 200, 300]));
    expect(t.ys).toEqual(expect.arrayContaining([0, 250, 500, 50, 450, 100, 150]));
  });
});

describe('computeSnap', () => {
  const targets = snapTargets([], format, { safeArea: 0 });
  it('przyciąga środek do środka płótna', () => {
    const r = computeSnap({ x: 446, y: 20, w: 100, h: 40 }, targets, 6);
    expect(r.dx).toBe(4);
    expect(r.guideX).toBe(500);
  });
  it('nie przyciąga poza progiem', () => {
    const r = computeSnap({ x: 430, y: 100, w: 100, h: 40 }, targets, 6);
    expect(r).toEqual({ dx: 0, dy: 0, guideX: null, guideY: null });
  });
  it('wybiera najbliższy cel', () => {
    const t = { xs: [100, 103], ys: [] };
    const r = computeSnap({ x: 104, y: 0, w: 10, h: 10 }, t, 6);
    expect(r.dx).toBe(-1);
    expect(r.guideX).toBe(103);
  });
  it('przyciąga prawą krawędź i dolną krawędź', () => {
    const r = computeSnap({ x: 897, y: 458, w: 100, h: 40 }, targets, 6);
    expect(r.dx).toBe(3);
    expect(r.dy).toBe(2);
    expect(r.guideX).toBe(1000);
    expect(r.guideY).toBe(500);
  });
});
