import { createStore } from '../core/store.js';
import { createSelection } from '../core/selection.js';
import { newDocument } from '../core/document.js';
import { createEditor } from '../canvas/editor.js';
import { preloadBundledFonts } from '../canvas/fontLoader.js';
import { createSettings } from './settings.js';
import { installImages } from './images.js';
import { installInteraction } from '../canvas/interaction.js';

// Moduły funkcji: każdy eksportuje install(app). Kolejne zadania dopisują tu swoje moduły.
// Moduły UI (pasek narzędzi, panele) muszą być na końcu — korzystają z akcji zarejestrowanych wcześniej.
const FEATURES = [installImages, installInteraction];

async function start() {
  await preloadBundledFonts();
  const api = window.api ?? {};
  const settings = await createSettings(api);
  const store = createStore(newDocument());
  const selection = createSelection();
  const editor = createEditor({ container: document.getElementById('stage'), store });
  const app = { api, settings, store, selection, editor, actions: {}, ui: {} };
  store.subscribe((doc) => selection.prune(doc));
  for (const install of FEATURES) await install(app);
  editor.fit();
  editor.renderNow();
  document.body.dataset.ready = 'true';
  if (api.isE2E) window.__plakat = app;
  return app;
}

start().catch((err) => {
  console.error(err);
  document.getElementById('statusbar').textContent = `Błąd uruchamiania: ${err.message}`;
});
