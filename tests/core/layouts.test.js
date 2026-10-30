import { describe, it, expect } from 'vitest';
import { LAYOUTS, LAYOUT_ROLES, computeLayout, applyLayout, layoutMargin, layoutPhotoHint } from '../../src/core/layouts.js';
import { FORMAT_PRESETS, ORIENTATIONS } from '../../src/core/constants.js';
import { createBaseDocument, createElement } from '../../src/core/model.js';

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const TEXT_ROLES = ['accent', 'title', 'subtitle', 'points', 'qr', 'footer'];

describe('layoutMargin', () => {
  it('to 6% krótszego boku', () => {
    expect(layoutMargin({ w: 1920, h: 1080 })).toBe(65);
    expect(layoutMargin({ w: 1080, h: 1920 })).toBe(65);
  });
});

describe('computeLayout', () => {
  for (const id of Object.keys(LAYOUTS)) {
    for (const preset of FORMAT_PRESETS) {
      for (const o of ORIENTATIONS) {
        const format = preset[o];
        const boxes = computeLayout(id, format, o);

        it(`${id} / ${preset.id} / ${o}: wszystkie role, ramki w granicach płótna`, () => {
          expect(Object.keys(boxes).sort()).toEqual([...LAYOUT_ROLES].sort());
          for (const [role, b] of Object.entries(boxes)) {
            expect(b.w, role).toBeGreaterThan(0);
            expect(b.h, role).toBeGreaterThan(0);
            if (b.hidden) continue;
            expect(b.x, role).toBeGreaterThanOrEqual(0);
            expect(b.y, role).toBeGreaterThanOrEqual(0);
            expect(b.x + b.w, role).toBeLessThanOrEqual(format.w + 1);
            expect(b.y + b.h, role).toBeLessThanOrEqual(format.h + 1);
          }
        });

        it(`${id} / ${preset.id} / ${o}: teksty, QR i zdjęcie nie nachodzą na siebie`, () => {
          const roles = id === 'full-photo' ? TEXT_ROLES : [...TEXT_ROLES, 'photo'];
          const visible = roles.filter((r) => !boxes[r].hidden);
          for (let i = 0; i < visible.length; i++) {
            for (let j = i + 1; j < visible.length; j++) {
              expect(overlaps(boxes[visible[i]], boxes[visible[j]]), `${visible[i]} × ${visible[j]}`).toBe(false);
            }
          }
        });
      }
    }
  }

  it('nieznany układ → split-left', () => {
    const f = { w: 1920, h: 1080 };
    expect(computeLayout('nie-ma', f, 'landscape')).toEqual(computeLayout('split-left', f, 'landscape'));
  });

  it('zdjęcie na spad zaczyna się w rogu płótna', () => {
    const b = computeLayout('full-photo', { w: 1920, h: 1080 }, 'landscape').photo;
    expect(b).toEqual({ x: 0, y: 0, w: 1920, h: 1080, rotation: 0, hidden: false });
  });
});

describe('applyLayout', () => {
  it('ustawia ramki ról w obu orientacjach i ukrywa nieużyte', () => {
    const doc = applyLayout(createBaseDocument(), 'split-left');
    for (const o of ORIENTATIONS) {
      for (const id of doc.order) expect(doc.boxes[o][id], `${o}/${id}`).toBeTruthy();
    }
    const panel = Object.values(doc.elements).find((e) => e.role === 'panel');
    expect(doc.boxes.landscape[panel.id].hidden).toBe(true);
    expect(doc.layoutId).toBe('split-left');
  });

  it('daje ramkę elementom "free" bez ruszania istniejących', () => {
    const doc = createBaseDocument();
    const a = createElement('text', 'free');
    const b = createElement('shape', 'free');
    doc.elements[a.id] = a;
    doc.elements[b.id] = b;
    doc.order.push(a.id, b.id);
    doc.boxes.landscape[b.id] = { x: 1, y: 2, w: 30, h: 40, rotation: 5, hidden: false };
    applyLayout(doc, 'card');
    expect(doc.boxes.landscape[a.id]).toBeTruthy();
    expect(doc.boxes.portrait[a.id]).toBeTruthy();
    expect(doc.boxes.landscape[b.id]).toEqual({ x: 1, y: 2, w: 30, h: 40, rotation: 5, hidden: false });
  });

  it('stosuje właściwości układu', () => {
    const doc = applyLayout(createBaseDocument(), 'card');
    const title = Object.values(doc.elements).find((e) => e.role === 'title');
    const photo = Object.values(doc.elements).find((e) => e.role === 'photo');
    expect(title.align).toBe('center');
    expect(photo.shape).toBe('circle');
    applyLayout(doc, 'split-left');
    expect(title.align === 'center').toBe(false);
    expect(doc.elements[title.id].align).toBe('left');
  });

  it('układa panel karty pod zdjęciem, a w innych układach zdjęcie pod panelem', () => {
    const roleAt = (doc, i) => doc.elements[doc.order[i]].role;
    const doc = applyLayout(createBaseDocument(), 'card');
    expect([roleAt(doc, 0), roleAt(doc, 1)]).toEqual(['panel', 'photo']);
    applyLayout(doc, 'full-photo');
    expect([roleAt(doc, 0), roleAt(doc, 1)]).toEqual(['photo', 'panel']);
    expect(doc.order).toHaveLength(Object.keys(doc.elements).length);
  });

  it('może zmienić tylko jedną orientację', () => {
    const doc = applyLayout(createBaseDocument(), 'split-left');
    const before = structuredClone(doc.boxes.portrait);
    applyLayout(doc, 'photo-top', ['landscape']);
    expect(doc.boxes.portrait).toEqual(before);
  });

  it('layoutPhotoHint', () => {
    expect(layoutPhotoHint('card')).toEqual({ shape: 'circle' });
    expect(layoutPhotoHint('split-left')).toBeNull();
    expect(layoutPhotoHint('full-photo')).toMatchObject({ shape: 'rect', shadow: false });
  });
});
