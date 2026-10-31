import { createBinder } from './binder.js';
import { installToolbar } from './toolbar.js';
import { installStatusbar } from './statusbar.js';
import { installSidebar } from './sidebar.js';
import { contentPanel } from './panels/content.js';

export const PANELS = [contentPanel];

export function installUI(app) {
  app.ui.binder = createBinder(app.store);
  installToolbar(app);
  installStatusbar(app);
  installSidebar(app, PANELS);
}
