import { describe, it, expect, vi } from 'vitest';
import { createSelection } from '../../src/core/selection.js';

describe('createSelection', () => {
  it('ustawia, przełącza i czyści', () => {
    const s = createSelection();
    const fn = vi.fn();
    s.subscribe(fn);
    s.set(['a']);
    s.toggle('b');
    expect(s.ids).toEqual(['a', 'b']);
    s.toggle('a');
    expect(s.ids).toEqual(['b']);
    expect(s.has('b')).toBe(true);
    s.clear();
    expect(s.ids).toEqual([]);
    expect(fn).toHaveBeenCalledTimes(4);
  });
  it('tryb kadrowania jest kasowany przy zmianie zaznaczenia', () => {
    const s = createSelection();
    s.set(['p']);
    s.setCrop('p');
    expect(s.cropId).toBe('p');
    s.set(['q']);
    expect(s.cropId).toBeNull();
  });
  it('prune usuwa nieistniejące elementy', () => {
    const s = createSelection();
    s.set(['a', 'b']);
    s.setCrop('b');
    s.prune({ elements: { a: {} } });
    expect(s.ids).toEqual(['a']);
    expect(s.cropId).toBeNull();
  });
  it('nie powiadamia, gdy nic się nie zmienia', () => {
    const s = createSelection();
    s.set(['a']);
    const fn = vi.fn();
    s.subscribe(fn);
    s.set(['a']);
    s.prune({ elements: { a: {} } });
    expect(fn).not.toHaveBeenCalled();
  });
});
