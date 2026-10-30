import { h } from './dom.js';

const shownToasts = new Map();
const modalStack = [];

export function toast(message, { type = 'info', timeout = 3500, action = null } = {}) {
  if (shownToasts.has(message)) return;
  const el = h('div', { class: `toast ${type}`, role: 'status' },
    message,
    action ? h('div', { style: { marginTop: '6px' } }, h('button', { class: 'btn small', onClick: action.onClick }, action.label)) : null);
  document.getElementById('toast-root').append(el);
  const remove = () => {
    el.remove();
    shownToasts.delete(message);
  };
  shownToasts.set(message, el);
  setTimeout(remove, timeout);
  el.addEventListener('click', remove);
}

export function openModal({ title, body, actions = [], size = '', onClose = null }) {
  const root = document.getElementById('modal-root');
  let closed = false;
  const previousFocus = document.activeElement;

  const actionButtons = actions.map((a) =>
    h('button', {
      class: `btn ${a.kind ?? ''}`,
      'data-testid': a.testId,
      onClick: () => (a.onClick ? a.onClick(api) : api.close(a.id)),
    }, a.label),
  );
  const modal = h('div', { class: `modal ${size}`, role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'modal-title' }, title),
    h('div', { class: 'modal-body' }, body),
    actionButtons.length ? h('div', { class: 'modal-actions' }, actionButtons) : null,
  );
  const backdrop = h('div', { class: 'modal-backdrop' }, modal);

  function onKey(e) {
    if (modalStack.at(-1) !== api) return; // Esc zamyka tylko okno na wierzchu
    if (e.key === 'Escape') {
      e.stopPropagation();
      api.close(null);
    }
  }

  const api = {
    element: modal,
    close(result) {
      if (closed) return;
      closed = true;
      modalStack.splice(modalStack.indexOf(api), 1);
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      previousFocus?.focus?.();
      onClose?.(result);
    },
  };

  modalStack.push(api);
  document.addEventListener('keydown', onKey, true);
  root.append(backdrop);
  const primary = actionButtons.find((b) => b.classList.contains('primary'));
  (modal.querySelector('input, textarea, select') ?? primary ?? actionButtons[0])?.focus();
  return api;
}

export function confirmDialog({ title, message, buttons }) {
  return new Promise((resolve) => {
    openModal({
      title,
      size: 'small',
      body: h('p', {}, message),
      actions: buttons.map((b) => ({ id: b.id, label: b.label, kind: b.kind, testId: `confirm-${b.id}` })),
      onClose: resolve,
    });
  });
}

export function alertDialog(title, message) {
  return confirmDialog({ title, message, buttons: [{ id: 'ok', label: 'OK', kind: 'primary' }] }).then(() => undefined);
}

export function promptDialog({ title, label, value = '', placeholder = '' }) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'text', value, placeholder });
    const modal = openModal({
      title,
      size: 'small',
      body: h('div', { class: 'field' }, h('label', {}, label), input),
      actions: [
        { id: null, label: 'Anuluj' },
        { label: 'OK', kind: 'primary', onClick: (m) => m.close(input.value.trim() || null) },
      ],
      onClose: resolve,
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') modal.close(input.value.trim() || null);
    });
    input.select();
  });
}
