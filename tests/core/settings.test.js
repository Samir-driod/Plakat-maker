import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings, addRecentColor } from '../../src/core/settings.js';

describe('mergeSettings', () => {
  it('zwraca domyślne dla pustych danych', () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('zle')).toEqual(DEFAULT_SETTINGS);
  });
  it('przyjmuje poprawne wartości i odrzuca błędne', () => {
    const s = mergeSettings({ exportScale: 2, exportFormat: 'gif', gridSize: 5000, snap: false, recent: ['a', 3, 'b'], jpgQuality: 0.5 });
    expect(s.exportScale).toBe(2);
    expect(s.exportFormat).toBe('png');
    expect(s.gridSize).toBe(DEFAULT_SETTINGS.gridSize);
    expect(s.snap).toBe(false);
    expect(s.recent).toEqual(['a', 'b']);
    expect(s.jpgQuality).toBe(0.5);
  });
  it('nie zwraca współdzielonych tablic', () => {
    const s = mergeSettings({});
    s.recent.push('x');
    expect(DEFAULT_SETTINGS.recent).toEqual([]);
  });
});

describe('addRecentColor', () => {
  it('dodaje na początek bez duplikatów, z limitem', () => {
    expect(addRecentColor(['#111111', '#222222'], '#222222')).toEqual(['#222222', '#111111']);
    expect(addRecentColor(['#111111'], 'palette:accent')).toEqual(['#111111']);
    const many = Array.from({ length: 12 }, (_, i) => `#0000${String(i).padStart(2, '0')}`);
    expect(addRecentColor(many, '#ffffff')).toHaveLength(12);
    expect(addRecentColor(many, '#FFFFFF')[0]).toBe('#ffffff');
  });
});
