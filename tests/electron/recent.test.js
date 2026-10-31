import { describe, it, expect } from 'vitest';
import { addRecent, removeRecent } from '../../electron/lib/recent.js';

describe('recent', () => {
  it('dodaje na początek bez duplikatów (bez wielkości liter)', () => {
    expect(addRecent(['C:\\a.plakat', 'C:\\b.plakat'], 'c:\\B.plakat')).toEqual(['c:\\B.plakat', 'C:\\a.plakat']);
  });
  it('pilnuje limitu', () => {
    const list = Array.from({ length: 10 }, (_, i) => `C:\\${i}.plakat`);
    expect(addRecent(list, 'C:\\nowy.plakat')).toHaveLength(10);
    expect(addRecent(list, 'C:\\nowy.plakat', 3)).toEqual(['C:\\nowy.plakat', 'C:\\0.plakat', 'C:\\1.plakat']);
  });
  it('usuwa', () => {
    expect(removeRecent(['C:\\A.plakat', 'C:\\b.plakat'], 'c:\\a.plakat')).toEqual(['C:\\b.plakat']);
  });
});
