import { describe, it, expect } from 'vitest';
import { comboFromEvent, keyName } from '../../src/core/keys.js';

const ev = (o) => ({ ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, key: '', code: '', ...o });

describe('comboFromEvent', () => {
  it('litery i cyfry niezależnie od układu klawiatury', () => {
    expect(comboFromEvent(ev({ code: 'KeyS', key: 's', ctrlKey: true }))).toBe('Ctrl+S');
    expect(comboFromEvent(ev({ code: 'KeyS', key: 'S', ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+S');
    expect(comboFromEvent(ev({ code: 'Digit1', key: '1', ctrlKey: true }))).toBe('Ctrl+1');
    expect(comboFromEvent(ev({ code: 'KeyZ', key: 'z', metaKey: true }))).toBe('Ctrl+Z');
  });
  it('nawiasy, plus i minus', () => {
    expect(comboFromEvent(ev({ code: 'BracketRight', key: '}', ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+]');
    expect(comboFromEvent(ev({ code: 'NumpadAdd', key: '+', ctrlKey: true }))).toBe('Ctrl+=');
    expect(comboFromEvent(ev({ code: 'Minus', key: '-', ctrlKey: true }))).toBe('Ctrl+-');
  });
  it('klawisze specjalne', () => {
    expect(comboFromEvent(ev({ code: 'ArrowLeft', key: 'ArrowLeft', shiftKey: true }))).toBe('Shift+ArrowLeft');
    expect(comboFromEvent(ev({ code: 'Delete', key: 'Delete' }))).toBe('Delete');
    expect(comboFromEvent(ev({ code: 'F5', key: 'F5' }))).toBe('F5');
    expect(keyName(ev({ code: 'Space', key: ' ' }))).toBe('Space');
  });
  it('AltGr (polskie znaki) daje kombinację z Alt, której nie używamy', () => {
    expect(comboFromEvent(ev({ code: 'KeyA', key: 'ą', ctrlKey: true, altKey: true }))).toBe('Ctrl+Alt+A');
  });
});
