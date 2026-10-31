import { h, clear } from './dom.js';

const FILE_MENU = [
  { action: 'newProject', label: 'Nowy projekt…', keys: 'Ctrl+N' },
  { action: 'openProject', label: 'Otwórz…', keys: 'Ctrl+O' },
  { action: 'openRecent', label: 'Ostatnie projekty…' },
  'sep',
  { action: 'saveProject', label: 'Zapisz', keys: 'Ctrl+S' },
  { action: 'saveProjectAs', label: 'Zapisz jako…', keys: 'Ctrl+Shift+S' },
  { action: 'saveAsTemplate', label: 'Zapisz jako szablon…' },
  'sep',
  { action: 'openExport', label: 'Eksportuj…', keys: 'Ctrl+E' },
  { action: 'copyToClipboard', label: 'Kopiuj plakat do schowka' },
];

const ADD_MENU = [
  { action: 'addText', label: 'Tekst', keys: 'T' },
  { action: 'addImageElement', label: 'Obraz (np. logo)…' },
  { action: 'addShape', args: ['rect'], label: 'Prostokąt', keys: 'R' },
  { action: 'addShape', args: ['ellipse'], label: 'Elipsa' },
  { action: 'addShape', args: ['line'], label: 'Linia' },
  { action: 'addQr', label: 'Kod QR' },
];

const sep = () => h('div', { class: 'toolbar-sep' });

function run(app, action, args = []) {
  Promise.resolve()
    .then(() => app.actions[action]?.(...args))
    .catch((err) => console.error(`Błąd akcji ${action}:`, err));
}

function menuButton(app, label, items, testId) {
  const available = items.filter((it) => it === 'sep' || app.actions[it.action]);
  const cleaned = available.filter((it, i, arr) => it !== 'sep' || (i > 0 && i < arr.length - 1 && arr[i - 1] !== 'sep'));
  if (!cleaned.some((it) => it !== 'sep')) return null;

  const close = () => {
    menu.hidden = true;
  };
  const menu = h('div', { class: 'menu', role: 'menu', hidden: true }, cleaned.map((it) =>
    it === 'sep'
      ? h('div', { class: 'menu-sep' })
      : h('button', {
        type: 'button',
        class: 'menu-item',
        role: 'menuitem',
        'data-testid': `menu-${it.action}${it.args ? `-${it.args.join('-')}` : ''}`,
        onClick: () => {
          close();
          run(app, it.action, it.args);
        },
      }, h('span', {}, it.label), it.keys ? h('span', { class: 'menu-keys' }, it.keys) : null)));
  const button = h('button', {
    type: 'button',
    class: 'btn',
    'data-testid': testId,
    'aria-haspopup': 'menu',
    onClick: (e) => {
      e.stopPropagation();
      const wasHidden = menu.hidden;
      document.dispatchEvent(new Event('menus:close'));
      menu.hidden = !wasHidden;
    },
  }, `${label} ▾`);
  const wrap = h('div', { class: 'menu-wrap' }, button, menu);
  document.addEventListener('menus:close', close);
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  return wrap;
}

function actionButton(app, { action, args, label, title, kind = '', icon = false, testId }) {
  if (!app.actions[action]) return null;
  return h('button', {
    type: 'button',
    class: `btn ${kind} ${icon ? 'icon' : ''}`.trim(),
    title,
    'data-testid': testId,
    onClick: () => run(app, action, args),
  }, label);
}

function orientationGroup(app) {
  const make = (value, label, title) =>
    h('button', { type: 'button', title, 'data-testid': `orientation-${value}`, onClick: () => run(app, 'setOrientation', [value]) }, label);
  const landscape = make('landscape', '▭ Poziomo', 'Orientacja pozioma (Ctrl+1)');
  const portrait = make('portrait', '▯ Pionowo', 'Orientacja pionowa (Ctrl+2)');
  const refresh = () => {
    landscape.classList.toggle('active', app.store.doc.orientation === 'landscape');
    portrait.classList.toggle('active', app.store.doc.orientation === 'portrait');
  };
  app.store.subscribe(refresh);
  refresh();
  return h('div', { class: 'seg' }, landscape, portrait);
}

function zoomGroup(app) {
  const label = h('button', { type: 'button', class: 'btn ghost', title: 'Dopasuj do okna (Ctrl+0)', onClick: () => run(app, 'zoomFit') }, '100%');
  app.editor.on('view', (view) => {
    label.textContent = `${Math.round(view.scale * 100)}%`;
  });
  return h('div', { class: 'toolbar-group' },
    h('button', { type: 'button', class: 'btn icon', title: 'Pomniejsz (Ctrl+-)', onClick: () => run(app, 'zoomOut') }, '−'),
    label,
    h('button', { type: 'button', class: 'btn icon', title: 'Powiększ (Ctrl+=)', onClick: () => run(app, 'zoomIn') }, '+'));
}

export function installToolbar(app) {
  const root = document.getElementById('toolbar');
  const undo = actionButton(app, { action: 'undo', label: '↶', title: 'Cofnij (Ctrl+Z)', icon: true, testId: 'btn-undo' });
  const redo = actionButton(app, { action: 'redo', label: '↷', title: 'Ponów (Ctrl+Y)', icon: true, testId: 'btn-redo' });
  const parts = [
    h('div', { class: 'toolbar-group' },
      menuButton(app, 'Plik', FILE_MENU, 'menu-file'),
      actionButton(app, { action: 'saveProject', label: 'Zapisz', title: 'Zapisz (Ctrl+S)', testId: 'btn-save' })),
    sep(),
    h('div', { class: 'toolbar-group' }, undo, redo),
    sep(),
    orientationGroup(app),
    sep(),
    menuButton(app, '+ Dodaj', ADD_MENU, 'menu-add'),
    h('div', { class: 'spacer' }),
    zoomGroup(app),
    sep(),
    h('div', { class: 'toolbar-group' },
      actionButton(app, { action: 'showShortcuts', label: '?', title: 'Skróty klawiszowe (F1)', icon: true }),
      actionButton(app, { action: 'present', label: '▶ Pokaz', title: 'Pokaz pełnoekranowy (F5)', testId: 'btn-present' }),
      actionButton(app, { action: 'openExport', label: 'Eksportuj', title: 'Eksport PNG / JPG / PDF (Ctrl+E)', kind: 'primary', testId: 'btn-export' })),
  ];
  clear(root).append(...parts.filter(Boolean));
  const refresh = () => {
    if (undo) undo.disabled = !app.store.canUndo();
    if (redo) redo.disabled = !app.store.canRedo();
  };
  app.store.subscribe(refresh);
  refresh();
}
