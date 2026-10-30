import { describe, it, expect } from 'vitest';
import {
  addElement, duplicateElements, deleteElements, reorder, nudge, setBox, toggleHidden, setLocked, renameElement,
} from '../../src/core/elementOps.js';
import { newDocument } from '../../src/core/document.js';
import { MIN_BOX } from '../../src/core/constants.js';

const fresh = () => newDocument();

describe('addElement', () => {
  it('dodaje element na wierzch z ramkami w obu orientacjach', () => {
    const doc = fresh();
    const id = addElement(doc, 'text', { overrides: { text: 'Nowy' } });
    expect(doc.order.at(-1)).toBe(id);
    expect(doc.elements[id]).toMatchObject({ type: 'text', role: 'free', text: 'Nowy', name: 'Tekst' });
    expect(doc.boxes.landscape[id]).toMatchObject({ x: 576, w: 768 });
    expect(doc.boxes.portrait[id]).toBeTruthy();
  });
  it('nadaje unikalne nazwy i centruje w punkcie', () => {
    const doc = fresh();
    addElement(doc, 'shape');
    const id = addElement(doc, 'shape', { at: { x: 100, y: 100 } });
    expect(doc.elements[id].name).toBe('Kształt 2');
    const b = doc.boxes.landscape[id];
    expect(b.x + b.w / 2).toBe(100);
    expect(b.y + b.h / 2).toBe(100);
  });
  it('obrazy i kształty są kwadratowe, linia jest cienka', () => {
    const doc = fresh();
    const img = addElement(doc, 'image');
    expect(doc.boxes.landscape[img].w).toBe(doc.boxes.landscape[img].h);
    const line = addElement(doc, 'shape', { overrides: { shape: 'line' } });
    expect(doc.boxes.landscape[line].h).toBe(24);
  });
});

describe('duplicateElements / deleteElements', () => {
  it('kopiuje tuż nad oryginałem z przesunięciem', () => {
    const doc = fresh();
    const src = doc.order[3];
    const [copy] = duplicateElements(doc, [src]);
    expect(doc.order.indexOf(copy)).toBe(doc.order.indexOf(src) + 1);
    expect(doc.elements[copy].role).toBe('free');
    expect(doc.elements[copy].name).toBe(`${doc.elements[src].name} (kopia)`);
    expect(doc.boxes.landscape[copy].x).toBe(doc.boxes.landscape[src].x + 24);
    doc.elements[copy].text = 'zmieniony';
    expect(doc.elements[src].text).not.toBe('zmieniony');
  });
  it('usuwa elementy, kolejność i ramki', () => {
    const doc = fresh();
    const ids = doc.order.slice(0, 2);
    expect(deleteElements(doc, ids)).toBe(2);
    for (const id of ids) {
      expect(doc.elements[id]).toBeUndefined();
      expect(doc.order).not.toContain(id);
      expect(doc.boxes.landscape[id]).toBeUndefined();
      expect(doc.boxes.portrait[id]).toBeUndefined();
    }
  });
});

describe('reorder', () => {
  const doc4 = () => ({ order: ['a', 'b', 'c', 'd'] });
  it('na wierzch / na spód', () => {
    const d = doc4();
    reorder(d, ['a', 'c'], 'front');
    expect(d.order).toEqual(['b', 'd', 'a', 'c']);
    reorder(d, ['c'], 'back');
    expect(d.order).toEqual(['c', 'b', 'd', 'a']);
  });
  it('o jedną warstwę', () => {
    const d = doc4();
    expect(reorder(d, ['a', 'b'], 'forward')).toBe(true);
    expect(d.order).toEqual(['c', 'a', 'b', 'd']);
    reorder(d, ['b'], 'backward');
    expect(d.order).toEqual(['c', 'b', 'a', 'd']);
  });
  it('zwraca false, gdy nic się nie zmienia', () => {
    const d = doc4();
    expect(reorder(d, ['d'], 'front')).toBe(false);
  });
});

describe('nudge / setBox', () => {
  it('przesuwa niezablokowane', () => {
    const doc = fresh();
    const [a, b] = doc.order;
    doc.elements[b].locked = true;
    const ax = doc.boxes.landscape[a].x;
    const bx = doc.boxes.landscape[b].x;
    expect(nudge(doc, [a, b], 10, -5)).toBe(true);
    expect(doc.boxes.landscape[a].x).toBe(ax + 10);
    expect(doc.boxes.landscape[b].x).toBe(bx);
  });
  it('setBox pilnuje minimum i liczb', () => {
    const doc = fresh();
    const id = doc.order[0];
    setBox(doc, id, { w: 1, h: NaN, x: 12.6 });
    expect(doc.boxes.landscape[id]).toMatchObject({ w: MIN_BOX, x: 12.6 });
    expect(Number.isFinite(doc.boxes.landscape[id].h)).toBe(true);
  });
});

describe('toggleHidden / setLocked / renameElement', () => {
  it('ukrywa wszystkie, jeśli któryś widoczny', () => {
    const doc = fresh();
    const ids = [doc.order[0], doc.order[3]]; // zdjęcie i tytuł (oba widoczne w układzie split-left)
    doc.boxes.landscape[ids[0]].hidden = true;
    toggleHidden(doc, ids);
    expect(ids.every((id) => doc.boxes.landscape[id].hidden)).toBe(true);
    toggleHidden(doc, ids);
    expect(ids.every((id) => !doc.boxes.landscape[id].hidden)).toBe(true);
    expect(doc.boxes.portrait[ids[0]].hidden).toBe(false);
  });
  it('blokuje i zmienia nazwę', () => {
    const doc = fresh();
    const id = doc.order[0];
    setLocked(doc, [id], true);
    expect(doc.elements[id].locked).toBe(true);
    expect(renameElement(doc, id, '  Moje zdjęcie  ')).toBe(true);
    expect(doc.elements[id].name).toBe('Moje zdjęcie');
    expect(renameElement(doc, id, '   ')).toBe(false);
  });
});
