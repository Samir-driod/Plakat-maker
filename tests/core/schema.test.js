import { describe, it, expect } from 'vitest';
import {
  ProjectError, mergeWithDefaults, normalizeDocument, collectAssetIds, serializeProject, parseProject, projectToObject,
} from '../../src/core/schema.js';
import { createBaseDocument, DEFAULT_PALETTE, ELEMENT_DEFAULTS } from '../../src/core/model.js';
import { SCHEMA_VERSION, MIN_BOX } from '../../src/core/constants.js';

function withBoxes(doc) {
  for (const o of ['landscape', 'portrait']) {
    doc.order.forEach((id, i) => {
      doc.boxes[o][id] = { x: 10 * i, y: 20 * i, w: 300, h: 120, rotation: 0, hidden: false };
    });
  }
  return doc;
}

function photoOf(doc) {
  return Object.values(doc.elements).find((e) => e.role === 'photo');
}

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('mergeWithDefaults', () => {
  it('uzupełnia brakujące i odrzuca złe typy', () => {
    const out = mergeWithDefaults({ a: 1, b: 'x', c: { d: true }, e: [1], f: null }, { a: 'zle', c: {}, e: 'nie', f: 'asset_1', z: 9 });
    expect(out).toEqual({ a: 1, b: 'x', c: { d: true }, e: [1], f: 'asset_1' });
  });
  it('odrzuca NaN i Infinity', () => {
    expect(mergeWithDefaults({ n: 5 }, { n: NaN })).toEqual({ n: 5 });
    expect(mergeWithDefaults({ n: 5 }, { n: Infinity })).toEqual({ n: 5 });
  });
  it('pole "data" zachowuje dowolne klucze tekstowe', () => {
    const out = mergeWithDefaults({ data: { url: '' } }, { data: { ssid: 'Dom', password: 'x', bad: 5 } });
    expect(out.data).toEqual({ ssid: 'Dom', password: 'x' });
  });
});

describe('serializacja w obie strony', () => {
  it('zachowuje dokument i usuwa nieużywane zasoby', () => {
    const doc = withBoxes(createBaseDocument());
    photoOf(doc).assetId = 'asset_a';
    const assets = { asset_a: { dataUrl: PNG, w: 10, h: 10, name: 'a.png' }, asset_b: { dataUrl: PNG, w: 1, h: 1, name: 'b.png' } };
    const parsed = parseProject(serializeProject(doc, assets));
    expect(parsed.doc).toEqual(doc);
    expect(Object.keys(parsed.assets)).toEqual(['asset_a']);
    expect(parsed.warnings).toEqual([]);
  });
  it('projectToObject zapisuje nagłówek aplikacji i wersję', () => {
    const obj = projectToObject(createBaseDocument(), {});
    expect(obj.app).toBe('plakat-maker');
    expect(obj.version).toBe(SCHEMA_VERSION);
  });
});

describe('parseProject — błędy', () => {
  it('uszkodzony JSON', () => {
    expect(() => parseProject('{nie json')).toThrow(ProjectError);
    expect(() => parseProject('{nie json')).toThrow(/uszkodzony/);
  });
  it('obcy plik', () => {
    expect(() => parseProject(JSON.stringify({ app: 'inna', version: 1, doc: {} }))).toThrow(/nie jest plikiem projektu/);
  });
  it('nowsza wersja', () => {
    expect(() => parseProject(JSON.stringify({ app: 'plakat-maker', version: 99, doc: {} }))).toThrow(/nowszej wersji/);
  });
  it('brak dokumentu', () => {
    expect(() => parseProject(JSON.stringify({ app: 'plakat-maker', version: 1 }))).toThrow(ProjectError);
  });
});

describe('normalizeDocument — naprawa danych', () => {
  it('pomija nieznane elementy i porządkuje kolejność', () => {
    const doc = withBoxes(createBaseDocument());
    doc.elements.zly = { id: 'zly', type: 'wideo' };
    doc.order = ['nie_ma', ...doc.order.slice(1), doc.order[0], doc.order[0]];
    const warnings = [];
    const out = normalizeDocument(doc, warnings);
    expect(out.elements.zly).toBeUndefined();
    expect(out.order).toHaveLength(Object.keys(out.elements).length);
    expect(new Set(out.order).size).toBe(out.order.length);
    expect(warnings.some((w) => w.includes('wideo'))).toBe(true);
  });
  it('naprawia kolory palety i elementów', () => {
    const doc = withBoxes(createBaseDocument());
    doc.palette.accent = 'bardzo-niebieski';
    const title = Object.values(doc.elements).find((e) => e.role === 'title');
    title.color = 'palette:nieznany';
    const out = normalizeDocument(doc);
    expect(out.palette.accent).toBe(DEFAULT_PALETTE.accent);
    expect(out.elements[title.id].color).toBe(ELEMENT_DEFAULTS.text.color);
  });
  it('uzupełnia zagnieżdżone pola i wartości wyliczeniowe', () => {
    const doc = withBoxes(createBaseDocument());
    const photo = photoOf(doc);
    delete photo.crop;
    photo.shape = 'trójkąt';
    const out = normalizeDocument(doc);
    expect(out.elements[photo.id].crop).toEqual({ zoom: 1, x: 0.5, y: 0.5 });
    expect(out.elements[photo.id].shape).toBe(ELEMENT_DEFAULTS.photo.shape);
  });
  it('ogranicza listę punktów do 6 tekstów', () => {
    const doc = withBoxes(createBaseDocument());
    const points = Object.values(doc.elements).find((e) => e.type === 'points');
    points.items = ['1', 2, '3', '4', '5', '6', '7', '8'];
    const out = normalizeDocument(doc);
    expect(out.elements[points.id].items).toEqual(['1', '3', '4', '5', '6', '7']);
  });
  it('naprawia ramki: brak → domyślna, za mała → minimum', () => {
    const doc = withBoxes(createBaseDocument());
    const [a, b] = doc.order;
    delete doc.boxes.landscape[a];
    doc.boxes.landscape[b] = { x: 5, y: 5, w: 2, h: NaN, rotation: 'x', hidden: 'tak' };
    const warnings = [];
    const out = normalizeDocument(doc, warnings);
    expect(out.boxes.landscape[a]).toMatchObject({ w: 768, h: 216, hidden: false });
    expect(out.boxes.landscape[b]).toEqual({ x: 5, y: 5, w: MIN_BOX, h: MIN_BOX, rotation: 0, hidden: false });
    expect(warnings.some((w) => w.includes('pozycji'))).toBe(true);
  });
  it('rzuca ProjectError dla nie-obiektu', () => {
    expect(() => normalizeDocument(null)).toThrow(ProjectError);
  });
});

describe('zasoby', () => {
  it('collectAssetIds zbiera wszystkie odwołania', () => {
    const doc = createBaseDocument();
    photoOf(doc).assetId = 'a1';
    Object.values(doc.elements).find((e) => e.type === 'qr').logoAssetId = 'a2';
    doc.background.imageId = 'a3';
    expect([...collectAssetIds(doc)].sort()).toEqual(['a1', 'a2', 'a3']);
  });
  it('usuwa odwołania do brakujących lub uszkodzonych zasobów', () => {
    const doc = withBoxes(createBaseDocument());
    photoOf(doc).assetId = 'zgubiony';
    doc.background.imageId = 'zly';
    const text = JSON.stringify({ app: 'plakat-maker', version: 1, doc, assets: { zly: { dataUrl: 'javascript:alert(1)' } } });
    const parsed = parseProject(text);
    expect(photoOf(parsed.doc).assetId).toBeNull();
    expect(parsed.doc.background.imageId).toBeNull();
    expect(parsed.assets).toEqual({});
    expect(parsed.warnings.length).toBeGreaterThanOrEqual(2);
  });
});
