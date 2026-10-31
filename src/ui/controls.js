import { h } from './dom.js';
import { PALETTE_KEYS, PALETTE_LABELS } from '../core/constants.js';
import { normalizeHex } from '../core/colors.js';
import { resolveColor } from '../core/model.js';
import { addRecentColor } from '../core/settings.js';

function emitter() {
  const fns = [];
  return { on: (fn) => fns.push(fn), emit: (...args) => fns.forEach((fn) => fn(...args)) };
}

const isFocused = (el) => document.activeElement === el;

export function textField({ label, multiline = false, placeholder = '', maxLength = 500, type = 'text', testId, rows = 2 } = {}) {
  const input = multiline
    ? h('textarea', { placeholder, maxlength: maxLength, rows, 'data-testid': testId })
    : h('input', { type, placeholder, maxlength: maxLength, 'data-testid': testId, spellcheck: 'true' });
  const change = emitter();
  const commit = emitter();
  input.addEventListener('input', () => change.emit(input.value));
  input.addEventListener('change', () => commit.emit());
  return {
    el: h('div', { class: 'field' }, label ? h('label', {}, label) : null, input),
    input,
    set(value) {
      const s = value ?? '';
      if (!isFocused(input) && input.value !== s) input.value = s;
    },
    onChange: change.on,
    onCommit: commit.on,
  };
}

export function slider({ label, min, max, step = 1, unit = '', format = (v) => v, testId } = {}) {
  const input = h('input', { type: 'range', min, max, step, 'data-testid': testId });
  const out = h('span', { class: 'slider-value' });
  const change = emitter();
  const commit = emitter();
  let dragging = false;
  const show = () => {
    out.textContent = `${format(Number(input.value))}${unit}`;
  };
  input.addEventListener('pointerdown', () => { dragging = true; });
  window.addEventListener('pointerup', () => { dragging = false; });
  input.addEventListener('input', () => {
    show();
    change.emit(Number(input.value));
  });
  input.addEventListener('change', () => commit.emit());
  return {
    el: h('div', { class: 'field' }, h('label', {}, h('span', {}, label), out), input),
    input,
    set(value) {
      if (dragging) return;
      input.value = String(value);
      show();
    },
    onChange: change.on,
    onCommit: commit.on,
  };
}

export function numberField({ label, min = -100000, max = 100000, step = 1, testId } = {}) {
  const input = h('input', { type: 'number', min, max, step, 'data-testid': testId });
  const change = emitter();
  const emit = () => {
    const v = Number(input.value);
    if (input.value !== '' && Number.isFinite(v)) change.emit(Math.min(max, Math.max(min, v)));
  };
  input.addEventListener('change', emit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') emit();
  });
  return {
    el: h('div', { class: 'field' }, label ? h('label', {}, label) : null, input),
    input,
    set(value) {
      if (!isFocused(input)) input.value = String(Math.round(Number(value) * 10) / 10);
    },
    onChange: change.on,
  };
}

export function selectField({ label, options, testId } = {}) {
  const select = h('select', { 'data-testid': testId });
  const groups = new Map();
  for (const o of options) {
    const opt = h('option', { value: String(o.value), style: o.style }, o.label);
    if (o.group) {
      if (!groups.has(o.group)) {
        const g = h('optgroup', { label: o.group });
        groups.set(o.group, g);
        select.append(g);
      }
      groups.get(o.group).append(opt);
    } else {
      select.append(opt);
    }
  }
  const change = emitter();
  select.addEventListener('change', () => change.emit(select.value));
  return {
    el: h('div', { class: 'field' }, label ? h('label', {}, label) : null, select),
    input: select,
    set(value) {
      if (value !== undefined && value !== null) select.value = String(value);
    },
    onChange: change.on,
  };
}

export function toggleField({ label, testId } = {}) {
  const input = h('input', { type: 'checkbox', 'data-testid': testId });
  const change = emitter();
  input.addEventListener('change', () => change.emit(input.checked));
  return {
    el: h('label', { class: 'toggle' }, input, h('span', {}, label)),
    input,
    set(value) {
      input.checked = !!value;
    },
    onChange: change.on,
  };
}

export function segmented({ label, options, testId } = {}) {
  const change = emitter();
  const buttons = options.map((o) =>
    h('button', {
      type: 'button',
      title: o.title ?? o.label,
      'data-value': String(o.value),
      'data-testid': testId ? `${testId}-${o.value}` : undefined,
      onClick: () => change.emit(o.value),
    }, o.label));
  return {
    el: h('div', { class: 'field' }, label ? h('label', {}, label) : null, h('div', { class: 'seg' }, buttons)),
    set(value) {
      for (const b of buttons) b.classList.toggle('active', b.dataset.value === String(value));
    },
    onChange: change.on,
  };
}

export function colorField({ label, settings = null, allowPalette = true, testId } = {}) {
  const change = emitter();
  const commit = emitter();
  let current = null;
  let palette = {};
  const paletteRow = h('div', { class: 'swatches' });
  const recentRow = h('div', { class: 'swatches' });
  const native = h('input', { type: 'color', class: 'color-native', title: 'Własny kolor', 'data-testid': testId });

  const remember = (hex) => {
    if (settings && hex?.startsWith('#')) settings.set({ recentColors: addRecentColor(settings.get('recentColors'), hex) });
  };
  const pick = (value, isNew) => {
    if (!value) return;
    current = value;
    change.emit(value);
    commit.emit();
    if (isNew) remember(value);
    draw();
  };

  const eyedropper = window.EyeDropper
    ? h('button', {
      type: 'button',
      class: 'btn small icon',
      title: 'Pobierz kolor z ekranu (pipeta)',
      onClick: async () => {
        try {
          const { sRGBHex } = await new window.EyeDropper().open();
          pick(normalizeHex(sRGBHex), true);
        } catch {
          /* anulowano */
        }
      },
    }, '⌖')
    : null;

  native.addEventListener('input', () => {
    current = native.value;
    change.emit(native.value);
  });
  native.addEventListener('change', () => {
    commit.emit();
    remember(native.value);
    draw();
  });

  function draw() {
    paletteRow.replaceChildren(...(allowPalette ? PALETTE_KEYS.map((k) => {
      const value = `palette:${k}`;
      return h('button', {
        type: 'button',
        class: `swatch${current === value ? ' active' : ''}`,
        title: `${PALETTE_LABELS[k]} (kolor motywu)`,
        style: { background: palette[k] ?? '#000' },
        onClick: () => pick(value, false),
      });
    }) : []));
    const recent = settings?.get('recentColors') ?? [];
    recentRow.replaceChildren(...recent.map((c) =>
      h('button', { type: 'button', class: `swatch${current === c ? ' active' : ''}`, title: c, style: { background: c }, onClick: () => pick(c, false) })));
  }

  return {
    el: h('div', { class: 'field' },
      label ? h('label', {}, label) : null,
      h('div', { class: 'color-control' }, paletteRow, native, eyedropper),
      recentRow),
    set(value, doc) {
      current = value;
      if (doc) palette = doc.palette;
      const hex = doc ? resolveColor(doc, value) : normalizeHex(value);
      if (hex && !isFocused(native)) native.value = hex;
      draw();
    },
    onChange: change.on,
    onCommit: commit.on,
  };
}

export function button(label, onClick, { kind = '', small = false, title, testId, disabled = false } = {}) {
  return h('button', {
    type: 'button',
    class: `btn ${kind} ${small ? 'small' : ''}`.trim(),
    title,
    'data-testid': testId,
    disabled,
    onClick,
  }, label);
}

export function section(title, children, { open = true } = {}) {
  return h('details', { class: 'section', open }, h('summary', {}, title), children);
}
