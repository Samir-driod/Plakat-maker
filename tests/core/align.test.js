import { describe, it, expect } from 'vitest';
import { unionBox, alignBoxes, distributeBoxes } from '../../src/core/align.js';

const boxes = [
  { id: 'a', x: 10, y: 10, w: 100, h: 50 },
  { id: 'b', x: 200, y: 100, w: 40, h: 40 },
];

describe('unionBox', () => {
  it('obejmuje wszystkie ramki', () => {
    expect(unionBox(boxes)).toEqual({ x: 10, y: 10, w: 230, h: 130 });
  });
});

describe('alignBoxes', () => {
  it('do lewej / prawej / środka względem sumy', () => {
    expect(alignBoxes(boxes, 'left')).toEqual([{ id: 'a', x: 10, y: 10 }, { id: 'b', x: 10, y: 100 }]);
    expect(alignBoxes(boxes, 'right')).toEqual([{ id: 'a', x: 140, y: 10 }, { id: 'b', x: 200, y: 100 }]);
    expect(alignBoxes(boxes, 'vcenter')).toEqual([{ id: 'a', x: 10, y: 50 }, { id: 'b', x: 200, y: 55 }]);
  });
  it('względem płótna', () => {
    const out = alignBoxes([boxes[0]], 'hcenter', { x: 0, y: 0, w: 1920, h: 1080 });
    expect(out).toEqual([{ id: 'a', x: 910, y: 10 }]);
    expect(alignBoxes([boxes[0]], 'bottom', { x: 0, y: 0, w: 1920, h: 1080 })[0].y).toBe(1030);
  });
});

describe('distributeBoxes', () => {
  it('równe odstępy w poziomie', () => {
    const out = distributeBoxes([
      { id: 'a', x: 0, y: 0, w: 10, h: 10 },
      { id: 'c', x: 90, y: 0, w: 10, h: 10 },
      { id: 'b', x: 20, y: 0, w: 10, h: 10 },
    ], 'h');
    expect(out.find((b) => b.id === 'b').x).toBe(45);
    expect(out.find((b) => b.id === 'a').x).toBe(0);
    expect(out.find((b) => b.id === 'c').x).toBe(90);
  });
  it('mniej niż 3 elementy — bez zmian', () => {
    expect(distributeBoxes(boxes, 'v')).toEqual([{ id: 'a', x: 10, y: 10 }, { id: 'b', x: 200, y: 100 }]);
  });
});
