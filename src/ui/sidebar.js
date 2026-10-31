import { h, clear } from './dom.js';

export function installSidebar(app, panels) {
  const tabs = document.getElementById('tabs');
  const root = document.getElementById('panel');
  let active = panels[0].id;
  let scope = null;
  let lastKey = null;

  function renderTabs() {
    clear(tabs).append(...panels.map((p) =>
      h('button', {
        type: 'button',
        class: `tab${p.id === active ? ' active' : ''}`,
        'data-testid': `tab-${p.id}`,
        onClick: () => app.ui.showTab(p.id),
      }, p.label)));
  }

  function rebuild(force = false) {
    const panel = panels.find((p) => p.id === active);
    const key = `${active}|${panel.key(app.store.doc, app.selection)}`;
    if (!force && key === lastKey) return;
    lastKey = key;
    const scrollTop = root.scrollTop;
    scope?.dispose();
    scope = app.ui.binder.scope();
    clear(root);
    try {
      panel.render(root, { app, binder: scope });
    } catch (err) {
      console.error('Błąd panelu', panel.id, err);
      root.append(h('p', { class: 'error-text' }, 'Nie udało się wyświetlić panelu. Spróbuj innej zakładki.'));
    }
    root.scrollTop = scrollTop;
    if (app.ui.focusAfterRender) {
      root.querySelector(app.ui.focusAfterRender)?.focus();
      app.ui.focusAfterRender = null;
    }
  }

  app.ui.showTab = (id) => {
    if (!panels.some((p) => p.id === id)) return;
    active = id;
    renderTabs();
    rebuild(true);
  };

  app.store.subscribe(() => rebuild());
  app.selection.subscribe(({ ids }) => {
    const hasElementPanel = panels.some((p) => p.id === 'element');
    if (ids.length && hasElementPanel && active !== 'element' && active !== 'layers') app.ui.showTab('element');
    else rebuild();
  });

  renderTabs();
  rebuild(true);
}
