import { describe, it, expect } from 'vitest';
import { createHistory } from '../../src/core/history.js';

function clock() {
  let t = 0;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

describe('createHistory', () => {
  it('cofa i ponawia', () => {
    const h = createHistory();
    h.record('A');
    h.record('B');
    expect(h.undo('C')).toBe('B');
    expect(h.undo('B')).toBe('A');
    expect(h.undo('A')).toBeNull();
    expect(h.redo('A')).toBe('B');
    expect(h.redo('B')).toBe('C');
    expect(h.canRedo()).toBe(false);
  });
  it('nowa zmiana czyści przyszłość', () => {
    const h = createHistory();
    h.record('A');
    h.undo('B');
    h.record('A');
    expect(h.canRedo()).toBe(false);
  });
  it('scala zmiany z tym samym kluczem w oknie czasu', () => {
    const c = clock();
    const h = createHistory({ coalesceMs: 800, now: c.now });
    h.record('A', 'title');
    c.advance(300);
    h.record('A1', 'title');
    c.advance(300);
    h.record('A2', 'title');
    expect(h.undo('A3')).toBe('A');
    expect(h.canUndo()).toBe(false);
  });
  it('nie scala po upływie czasu ani dla innego klucza', () => {
    const c = clock();
    const h = createHistory({ coalesceMs: 800, now: c.now });
    h.record('A', 'k');
    c.advance(900);
    h.record('B', 'k');
    h.record('C', 'inny');
    expect(h.undo('D')).toBe('C');
    expect(h.undo('C')).toBe('B');
    expect(h.undo('B')).toBe('A');
  });
  it('breakCoalescing wymusza nowy krok', () => {
    const h = createHistory();
    h.record('A', 'k');
    h.breakCoalescing();
    h.record('B', 'k');
    expect(h.undo('C')).toBe('B');
  });
  it('pilnuje limitu', () => {
    const h = createHistory({ limit: 3 });
    ['A', 'B', 'C', 'D'].forEach((s) => h.record(s));
    expect(h.undo('E')).toBe('D');
    expect(h.undo('D')).toBe('C');
    expect(h.undo('C')).toBe('B');
    expect(h.undo('B')).toBeNull();
  });
});
