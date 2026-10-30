import { comboFromEvent } from '../core/keys.js';
import { isTypingTarget, h } from './dom.js';
import { openModal } from './dialogs.js';

export const SHORTCUTS = [
  { keys: 'Ctrl+N', action: 'newProject', label: 'Nowy projekt', global: true },
  { keys: 'Ctrl+O', action: 'openProject', label: 'Otwórz projekt', global: true },
  { keys: 'Ctrl+S', action: 'saveProject', label: 'Zapisz', global: true },
  { keys: 'Ctrl+Shift+S', action: 'saveProjectAs', label: 'Zapisz jako…', global: true },
  { keys: 'Ctrl+E', action: 'openExport', label: 'Eksport (PNG / JPG / PDF)', global: true },
  { keys: 'F5', action: 'present', label: 'Pokaz pełnoekranowy', global: true },
  { keys: 'Ctrl+Z', action: 'undo', label: 'Cofnij' },
  { keys: 'Ctrl+Y', action: 'redo', label: 'Ponów' },
  { keys: 'Ctrl+Shift+Z', action: 'redo', hidden: true },
  { keys: 'Ctrl+D', action: 'duplicateSelection', label: 'Duplikuj zaznaczone' },
  { keys: 'Delete', action: 'deleteSelection', label: 'Usuń zaznaczone' },
  { keys: 'Backspace', action: 'deleteSelection', hidden: true },
  { keys: 'Ctrl+A', action: 'selectAll', label: 'Zaznacz wszystko' },
  { keys: 'Escape', action: 'deselect', label: 'Odznacz / zakończ kadrowanie' },
  { keys: 'ArrowLeft', action: 'nudgeSelection', args: [-1, 0], label: 'Przesuń o 1 px (Shift: 10 px)' },
  { keys: 'ArrowRight', action: 'nudgeSelection', args: [1, 0], hidden: true },
  { keys: 'ArrowUp', action: 'nudgeSelection', args: [0, -1], hidden: true },
  { keys: 'ArrowDown', action: 'nudgeSelection', args: [0, 1], hidden: true },
  { keys: 'Shift+ArrowLeft', action: 'nudgeSelection', args: [-10, 0], hidden: true },
  { keys: 'Shift+ArrowRight', action: 'nudgeSelection', args: [10, 0], hidden: true },
  { keys: 'Shift+ArrowUp', action: 'nudgeSelection', args: [0, -10], hidden: true },
  { keys: 'Shift+ArrowDown', action: 'nudgeSelection', args: [0, 10], hidden: true },
  { keys: 'Ctrl+]', action: 'reorderSelection', args: ['forward'], label: 'Warstwa wyżej' },
  { keys: 'Ctrl+[', action: 'reorderSelection', args: ['backward'], label: 'Warstwa niżej' },
  { keys: 'Ctrl+Shift+]', action: 'reorderSelection', args: ['front'], label: 'Na wierzch' },
  { keys: 'Ctrl+Shift+[', action: 'reorderSelection', args: ['back'], label: 'Na spód' },
  { keys: 'Ctrl+L', action: 'toggleLockSelection', label: 'Zablokuj / odblokuj' },
  { keys: 'Ctrl+H', action: 'toggleHiddenSelection', label: 'Ukryj / pokaż w tej orientacji' },
  { keys: 'Ctrl+1', action: 'setOrientation', args: ['landscape'], label: 'Orientacja pozioma' },
  { keys: 'Ctrl+2', action: 'setOrientation', args: ['portrait'], label: 'Orientacja pionowa' },
  { keys: 'Ctrl+0', action: 'zoomFit', label: 'Dopasuj widok' },
  { keys: 'Ctrl+=', action: 'zoomIn', label: 'Powiększ' },
  { keys: 'Ctrl+Shift+=', action: 'zoomIn', hidden: true },
  { keys: 'Ctrl+-', action: 'zoomOut', label: 'Pomniejsz' },
  { keys: 'Ctrl+G', action: 'toggleGrid', label: 'Siatka' },
  { keys: 'Ctrl+Shift+G', action: 'toggleSafeArea', label: 'Obszar bezpieczny TV' },
  { keys: 'Ctrl+Shift+P', action: 'toggleSnap', label: 'Przyciąganie wł./wył.' },
  { keys: 'T', action: 'addText', label: 'Dodaj tekst' },
  { keys: 'R', action: 'addShape', args: ['rect'], label: 'Dodaj prostokąt' },
  { keys: 'F1', action: 'showShortcuts', label: 'Ta pomoc', global: true },
];

const EXTRA_HELP = [
  ['Ctrl + kółko myszy', 'Przybliżanie w miejscu kursora'],
  ['Spacja + przeciąganie / środkowy przycisk', 'Przesuwanie widoku'],
  ['Shift / Ctrl + klik', 'Dodaj lub usuń z zaznaczenia'],
  ['Alt podczas przeciągania', 'Bez przyciągania'],
  ['Dwuklik na zdjęciu', 'Kadrowanie (kółko = zoom)'],
  ['Alt + upuszczenie pliku', 'Wstaw jako nowy obraz'],
  ['Ctrl + V', 'Wklej obraz ze schowka'],
];

const prettyKeys = (keys) => keys.replace('ArrowLeft', 'Strzałki').replace('Escape', 'Esc').replace(/\+/g, ' + ');

function showShortcuts() {
  const rows = [
    ...SHORTCUTS.filter((s) => !s.hidden).map((s) => [prettyKeys(s.keys), s.label]),
    ...EXTRA_HELP,
  ];
  openModal({
    title: 'Skróty klawiszowe',
    body: h('table', { class: 'shortcut-table' },
      rows.map(([keys, label]) => h('tr', {}, h('td', {}, h('span', { class: 'kbd' }, keys)), h('td', {}, label)))),
    actions: [{ id: 'ok', label: 'Zamknij', kind: 'primary' }],
  });
}

export function installShortcuts(app) {
  app.actions.showShortcuts = showShortcuts;
  const map = new Map(SHORTCUTS.map((s) => [s.keys, s]));
  window.addEventListener('keydown', (e) => {
    if (document.querySelector('.modal-backdrop')) return;
    const shortcut = map.get(comboFromEvent(e));
    if (!shortcut) return;
    if (isTypingTarget(e.target) && !shortcut.global) return;
    const fn = app.actions[shortcut.action];
    if (!fn) return;
    e.preventDefault();
    Promise.resolve()
      .then(() => fn(...(shortcut.args ?? [])))
      .catch((err) => console.error(`Błąd akcji ${shortcut.action}:`, err));
  });
}
