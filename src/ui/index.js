import { createBinder } from './binder.js';
import { installToolbar } from './toolbar.js';
import { installStatusbar } from './statusbar.js';
import { installSidebar } from './sidebar.js';
import { contentPanel } from './panels/content.js';
import { stylePanel } from './panels/style.js';
import { layoutPanel } from './panels/layout.js';
import { elementPanel } from './panels/element.js';
import { layersPanel } from './panels/layers.js';

export const PANELS = [contentPanel, stylePanel, layoutPanel, elementPanel, layersPanel];

export function installUI(app) {
  app.ui.binder = createBinder(app.store);
  installToolbar(app);
  installStatusbar(app);
  installSidebar(app, PANELS);
  app.actions.focusElementField = (id) => {
    app.ui.focusAfterRender = '[data-testid="el-text"], [data-testid="point-input-0"], [data-testid="qr-kind"]';
    app.selection.set([id]);
    app.ui.showTab('element');
  };
}
