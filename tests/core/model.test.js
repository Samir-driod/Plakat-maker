import { describe, it, expect } from 'vitest';
import {
  ELEMENT_DEFAULTS, createElement, createBaseDocument, resolveColor, resolveFont, currentFormat, getBox,
} from '../../src/core/model.js';
import { newId } from '../../src/core/ids.js';
import { ROLES, ELEMENT_TYPES } from '../../src/core/constants.js';

describe('newId', () => {
  it('generuje unikalne identyfikatory z prefiksem', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId('x')));
    expect(ids.size).toBe(500);
    expect([...ids][0].startsWith('x_')).toBe(true);
  });
});

describe('createElement', () => {
  it('tworzy element z domyślnymi wartościami typu', () => {
    const el = createElement('text', 'title', { text: 'Cześć' });
    expect(el.type).toBe('text');
    expect(el.role).toBe('title');
    expect(el.text).toBe('Cześć');
    expect(el.size).toBe(ELEMENT_DEFAULTS.text.size);
    expect(el.locked).toBe(false);
    expect(el.name).toBe('Tytuł');
  });
  it('nie współdzieli zagnieżdżonych obiektów między elementami', () => {
    const a = createElement('photo', 'photo');
    const b = createElement('photo', 'free');
    a.crop.zoom = 3;
    expect(b.crop.zoom).toBe(1);
  });
  it('odrzuca nieznany typ', () => {
    expect(() => createElement('wideo')).toThrow(/Nieznany typ/);
  });
});

describe('createBaseDocument', () => {
  const doc = createBaseDocument();
  it('ma elementy dla wszystkich ról poza "free"', () => {
    const roles = Object.values(doc.elements).map((e) => e.role).sort();
    expect(roles).toEqual(ROLES.filter((r) => r !== 'free').sort());
  });
  it('kolejność zawiera wszystkie elementy, zdjęcie na spodzie', () => {
    expect(doc.order).toHaveLength(Object.keys(doc.elements).length);
    expect(doc.elements[doc.order[0]].role).toBe('photo');
  });
  it('ma formaty dla obu orientacji i puste ramki', () => {
    expect(doc.formats.landscape).toEqual({ w: 1920, h: 1080 });
    expect(doc.formats.portrait).toEqual({ w: 1080, h: 1920 });
    expect(doc.boxes).toEqual({ landscape: {}, portrait: {} });
  });
  it('używa tylko znanych typów', () => {
    for (const el of Object.values(doc.elements)) expect(ELEMENT_TYPES).toContain(el.type);
  });
});

describe('resolveColor / resolveFont', () => {
  const doc = createBaseDocument();
  it('rozwiązuje odwołania do palety', () => {
    expect(resolveColor(doc, 'palette:accent')).toBe(doc.palette.accent);
    expect(resolveColor(doc, '#ABCDEF')).toBe('#abcdef');
    expect(resolveColor(doc, 'palette:nieznany', '#123456')).toBe('#123456');
    expect(resolveColor(doc, 'zielony', '#654321')).toBe('#654321');
  });
  it('rozwiązuje czcionki', () => {
    expect(resolveFont(doc, 'heading')).toBe(doc.fonts.heading);
    expect(resolveFont(doc, 'body')).toBe(doc.fonts.body);
    expect(resolveFont(doc, 'Lora')).toBe('Lora');
  });
});

describe('currentFormat / getBox', () => {
  it('zwraca format i ramkę bieżącej orientacji', () => {
    const doc = createBaseDocument();
    doc.orientation = 'portrait';
    expect(currentFormat(doc)).toEqual({ w: 1080, h: 1920 });
    const id = doc.order[0];
    doc.boxes.portrait[id] = { x: 1, y: 2, w: 3, h: 4, rotation: 0, hidden: false };
    expect(getBox(doc, id)).toEqual(doc.boxes.portrait[id]);
    expect(getBox(doc, id, 'landscape')).toBeNull();
  });
});
