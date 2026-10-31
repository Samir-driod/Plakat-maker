import { describe, it, expect } from 'vitest';
import { newDocument, setFormat, chooseLayout, findByRole, restoreRole, STARTERS } from '../../src/core/document.js';
import { getTheme, applyTheme } from '../../src/core/themes.js';
import { LAYOUTS } from '../../src/core/layouts.js';
import { ORIENTATIONS } from '../../src/core/constants.js';

describe('newDocument', () => {
  it('tworzy kompletny dokument z motywem i układem', () => {
    const doc = newDocument({ themeId: 'las', layoutId: 'card', orientation: 'portrait' });
    expect(doc.themeId).toBe('las');
    expect(doc.layoutId).toBe('card');
    expect(doc.orientation).toBe('portrait');
    expect(doc.palette).toEqual(getTheme('las').palette);
    for (const o of ORIENTATIONS) for (const id of doc.order) expect(doc.boxes[o][id]).toBeTruthy();
  });
  it('STARTERS wskazują istniejące motywy i układy', () => {
    for (const s of STARTERS) {
      expect(getTheme(s.themeId).id).toBe(s.themeId);
      expect(LAYOUTS[s.layoutId]).toBeTruthy();
    }
  });
});

describe('setFormat', () => {
  it('skaluje ramki proporcjonalnie', () => {
    const doc = newDocument();
    const id = doc.order[0];
    doc.boxes.landscape[id] = { x: 960, y: 540, w: 192, h: 108, rotation: 0, hidden: false };
    setFormat(doc, '4:3');
    expect(doc.formatId).toBe('4:3');
    expect(doc.formats.landscape).toEqual({ w: 1600, h: 1200 });
    expect(doc.boxes.landscape[id]).toMatchObject({ x: 800, y: 600, w: 160, h: 120 });
  });
  it('własny rozmiar: poziom = dłuższy bok, pion = zamieniony, z ograniczeniem', () => {
    const doc = newDocument();
    setFormat(doc, 'custom', { w: 900, h: 99999 });
    expect(doc.formatId).toBe('custom');
    expect(doc.formats.landscape).toEqual({ w: 8000, h: 900 });
    expect(doc.formats.portrait).toEqual({ w: 900, h: 8000 });
  });
  it('nieznany format → 16:9', () => {
    const doc = newDocument();
    setFormat(doc, 'xyz');
    expect(doc.formatId).toBe('16:9');
  });
});

describe('chooseLayout', () => {
  it('przywraca styl zdjęcia z motywu po układzie z podpowiedzią', () => {
    const doc = newDocument({ themeId: 'nocny', layoutId: 'card' });
    const photo = findByRole(doc, 'photo');
    expect(photo.shape).toBe('circle');
    chooseLayout(doc, 'split-left');
    expect(findByRole(doc, 'photo').shape).toBe(getTheme('nocny').photo.shape);
  });
});

describe('styl zdjęcia z podpowiedzią układu', () => {
  it('karta: koło z ramką motywu, bez cienia', () => {
    const doc = newDocument({ themeId: 'ocean', layoutId: 'card' });
    const photo = findByRole(doc, 'photo');
    expect(photo.shape).toBe('circle');
    expect(photo.borderWidth).toBe(10);
    expect(photo.shadow).toBe(false);
  });
  it('zmiana motywu w karcie aktualizuje ramkę i zachowuje koło', () => {
    const doc = newDocument({ themeId: 'nocny', layoutId: 'card' });
    applyTheme(doc, getTheme('ocean'));
    const photo = findByRole(doc, 'photo');
    expect(photo.shape).toBe('circle');
    expect(photo.borderWidth).toBe(10);
  });
  it('ramka karty nie zależy od ścieżki: układ wybrany po motywie daje tę samą ramkę', () => {
    const doc = chooseLayout(newDocument({ themeId: 'ocean', layoutId: 'split-left' }), 'card');
    const photo = findByRole(doc, 'photo');
    expect(photo.shape).toBe('circle');
    expect(photo.borderWidth).toBe(10);
  });
});

describe('findByRole / restoreRole', () => {
  it('odtwarza usunięty element z ramkami i miejscem w kolejności', () => {
    const doc = newDocument();
    const title = findByRole(doc, 'title');
    delete doc.elements[title.id];
    doc.order = doc.order.filter((id) => id !== title.id);
    for (const o of ORIENTATIONS) delete doc.boxes[o][title.id];
    expect(findByRole(doc, 'title')).toBeNull();
    const id = restoreRole(doc, 'title');
    expect(doc.elements[id].role).toBe('title');
    expect(doc.order).toContain(id);
    for (const o of ORIENTATIONS) expect(doc.boxes[o][id].hidden).toBe(false);
  });
  it('zdjęcie wraca na spód (a w karcie tuż nad panelem)', () => {
    const card = newDocument({ layoutId: 'card' });
    const cardPhoto = findByRole(card, 'photo');
    delete card.elements[cardPhoto.id];
    card.order = card.order.filter((id) => id !== cardPhoto.id);
    const restored = restoreRole(card, 'photo');
    expect(card.order[1]).toBe(restored);
    const doc = newDocument();
    const photo = findByRole(doc, 'photo');
    delete doc.elements[photo.id];
    doc.order = doc.order.filter((id) => id !== photo.id);
    const id = restoreRole(doc, 'photo');
    expect(doc.order[0]).toBe(id);
  });
  it('nie dubluje istniejącego elementu', () => {
    const doc = newDocument();
    const before = doc.order.length;
    expect(restoreRole(doc, 'qr')).toBe(findByRole(doc, 'qr').id);
    expect(doc.order).toHaveLength(before);
  });
});
