const CODE_KEYS = {
  BracketLeft: '[', BracketRight: ']', Equal: '=', Minus: '-', NumpadAdd: '=', NumpadSubtract: '-',
  Semicolon: ';', Quote: "'", Slash: '/', Backslash: '\\', Comma: ',', Period: '.', Backquote: '`',
};

export function keyName(e) {
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3);
  if (/^Digit\d$/.test(e.code)) return e.code.slice(5);
  if (/^Numpad\d$/.test(e.code)) return e.code.slice(6);
  if (CODE_KEYS[e.code]) return CODE_KEYS[e.code];
  if (e.key === ' ' || e.code === 'Space') return 'Space';
  if (e.key && e.key.length === 1) return e.key.toUpperCase();
  return e.key;
}

export function comboFromEvent(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(keyName(e));
  return parts.join('+');
}
