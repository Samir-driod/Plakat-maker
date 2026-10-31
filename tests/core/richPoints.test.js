import { describe, it, expect } from 'vitest';
import { splitLead, wrapRuns, normalizeItemStyle, normalizeItemStyles } from '../../src/core/richPoints.js';

describe('splitLead', () => {
  it('rozdziela na myślniku (różne rodzaje)', () => {
    expect(splitLead('Więcej inicjatyw - wspieranie pomysłów')).toEqual({ lead: 'Więcej inicjatyw', rest: ' - wspieranie pomysłów' });
    expect(splitLead('A – b').lead).toBe('A');
    expect(splitLead('A — b').lead).toBe('A');
  });
  it('dwukropek zostaje w haśle', () => {
    expect(splitLead('Termin: piątek')).toEqual({ lead: 'Termin:', rest: ' piątek' });
  });
  it('bierze pierwszy separator', () => {
    expect(splitLead('A - b - c')).toEqual({ lead: 'A', rest: ' - b - c' });
  });
  it('bez separatora lub z łącznikiem w słowie — brak hasła', () => {
    expect(splitLead('Zwykły punkt')).toEqual({ lead: '', rest: 'Zwykły punkt' });
    expect(splitLead('biało-czerwony tekst')).toEqual({ lead: '', rest: 'biało-czerwony tekst' });
  });
});

describe('wrapRuns', () => {
  const measure = (t, style) => t.length * (style === 'b' ? 2 : 1);
  const texts = (lines) => lines.map((l) => l.map((f) => f.text).join(''));

  it('mieści wszystko w jednej linii', () => {
    const lines = wrapRuns([{ text: 'ab', style: 'b' }, { text: ' - cd', style: 'n' }], 100, measure);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual([
      { text: 'ab', style: 'b', x: 0, width: 4 },
      { text: ' - cd', style: 'n', x: 4, width: 5 },
    ]);
  });
  it('zawija po słowach i obcina spacje na końcach linii', () => {
    expect(texts(wrapRuns([{ text: 'aaa bbb ccc', style: 'n' }], 7, measure))).toEqual(['aaa bbb', 'ccc']);
  });
  it('uwzględnia szerokość zależną od stylu', () => {
    const lines = wrapRuns([{ text: 'aa bb', style: 'b' }, { text: ' cc', style: 'n' }], 10, measure);
    expect(texts(lines)).toEqual(['aa bb', 'cc']);
    expect(lines[1][0]).toMatchObject({ x: 0, style: 'n' });
  });
  it('za długie słowo ląduje w osobnej linii', () => {
    expect(texts(wrapRuns([{ text: 'a bardzodlugie c', style: 'n' }], 5, measure))).toEqual(['a', 'bardzodlugie', 'c']);
  });
  it('pusty tekst daje jedną pustą linię', () => {
    expect(wrapRuns([{ text: '', style: 'n' }], 10, measure)).toEqual([[]]);
  });
});

describe('normalizeItemStyle(s)', () => {
  it('zostawia tylko poprawne nadpisania', () => {
    expect(normalizeItemStyle({
      color: '#FF0000', bulletColor: 'palette:accent', leadColor: 'palette:nope', bullet: '★★★★★', bold: false, scale: 9, x: 1,
    })).toEqual({ color: '#ff0000', bulletColor: 'palette:accent', bullet: '★★★★', bold: false, scale: 2 });
    expect(normalizeItemStyle('zle')).toEqual({});
  });
  it('przycina listę do liczby punktów', () => {
    expect(normalizeItemStyles([{ scale: 1.5 }, null, {}, {}, {}], 3)).toEqual([{ scale: 1.5 }, {}, {}]);
    expect(normalizeItemStyles(undefined, 2)).toEqual([]);
  });
});

describe('wrapRuns: sklejanie', () => {
  const measure = (t) => t.length;
  const texts = (lines) => lines.map((l) => l.map((f) => f.text).join(''));
  it('kawałki różnych stylów bez spacji nie rozdzielają się', () => {
    const lines = wrapRuns([{ text: 'aaa bb', style: 'lead' }, { text: ' - cc', style: 'n' }], 7, measure);
    expect(texts(lines)).toEqual(['aaa', 'bb - cc']);
  });
  it('nie łamie na twardej spacji', () => {
    expect(texts(wrapRuns([{ text: 'aaaa bbbb', style: 'n' }], 5, measure))).toEqual(['aaaa bbbb']);
  });
});
