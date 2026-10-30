import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../../src/core/store.js';

const base = () => ({ n: 1, list: [1] });

describe('createStore', () => {
  it('update działa na kopii i powiadamia subskrybentów', () => {
    const initial = base();
    const store = createStore(initial);
    const fn = vi.fn();
    store.subscribe(fn);
    store.update((d) => { d.n = 2; d.list.push(2); });
    expect(initial).toEqual({ n: 1, list: [1] });
    expect(store.doc).toEqual({ n: 2, list: [1, 2] });
    expect(fn).toHaveBeenCalledWith(store.doc, { reason: 'edit' });
    expect(store.dirty).toBe(true);
  });
  it('recipe zwracający false nic nie zmienia', () => {
    const store = createStore(base());
    const fn = vi.fn();
    store.subscribe(fn);
    expect(store.update(() => false)).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    expect(store.canUndo()).toBe(false);
    expect(store.dirty).toBe(false);
  });
  it('cofa i ponawia', () => {
    const store = createStore(base());
    store.update((d) => { d.n = 2; });
    store.update((d) => { d.n = 3; });
    expect(store.undo()).toBe(true);
    expect(store.doc.n).toBe(2);
    expect(store.redo()).toBe(true);
    expect(store.doc.n).toBe(3);
  });
  it('history: false nie zapisuje kroku', () => {
    const store = createStore(base());
    store.update((d) => { d.n = 5; }, { history: false });
    expect(store.canUndo()).toBe(false);
    expect(store.doc.n).toBe(5);
  });
  it('replace czyści historię i ustawia flagę', () => {
    const store = createStore(base());
    store.update((d) => { d.n = 2; });
    const fn = vi.fn();
    store.subscribe(fn);
    store.replace({ n: 9, list: [] }, { a: { dataUrl: 'data:image/png;base64,' } });
    expect(store.canUndo()).toBe(false);
    expect(store.dirty).toBe(false);
    expect(store.getAsset('a')).toBeTruthy();
    expect(fn).toHaveBeenCalledWith(store.doc, { reason: 'load' });
  });
  it('markSaved zeruje flagę', () => {
    const store = createStore(base());
    store.update((d) => { d.n = 2; });
    store.markSaved();
    expect(store.dirty).toBe(false);
  });
  it('addAsset zwraca nowy identyfikator', () => {
    const store = createStore(base());
    const id = store.addAsset({ dataUrl: 'data:image/png;base64,', w: 1, h: 1, name: 'x' });
    expect(store.getAsset(id).name).toBe('x');
    expect(store.getAsset('nie')).toBeNull();
  });
  it('wyjątek subskrybenta nie psuje innych', () => {
    const store = createStore(base());
    const good = vi.fn();
    store.subscribe(() => { throw new Error('boom'); });
    store.subscribe(good);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    store.update((d) => { d.n = 2; });
    expect(good).toHaveBeenCalled();
    spy.mockRestore();
  });
});
