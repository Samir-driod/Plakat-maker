import { renderPoster } from '../canvas/exporter.js';
import { presentationScale } from '../core/exportSizes.js';
import { openModal, toast } from '../ui/dialogs.js';
import { h } from '../ui/dom.js';

function chooseDisplay(displays) {
  return new Promise((resolve) => {
    const preferred = displays.find((d) => !d.primary) ?? displays[0];
    const modal = openModal({
      title: 'Na którym ekranie pokazać plakat?',
      size: 'small',
      body: h('div', { class: 'layer-list' }, displays.map((d) =>
        h('div', { class: `layer-row${d.id === preferred.id ? ' selected' : ''}`, onClick: () => modal.close(d) },
          h('span', { class: 'layer-name' }, d.label)))),
      actions: [{ id: null, label: 'Anuluj' }, { label: 'Pokaż', kind: 'primary', onClick: (m) => m.close(preferred) }],
      onClose: resolve,
    });
  });
}

export function installPresentation(app) {
  const { api, store, editor } = app;
  if (!api.present) return;

  app.actions.present = async () => {
    const displays = (await api.listDisplays()) ?? [];
    if (!displays.length) return;
    const display = displays.length > 1 ? await chooseDisplay(displays) : displays[0];
    if (!display) return;
    const doc = store.doc;
    const format = doc.formats[doc.orientation];
    const screenLandscape = display.width >= display.height;
    if (screenLandscape !== (format.w >= format.h)) {
      toast(`Plakat jest ${format.w >= format.h ? 'poziomy' : 'pionowy'}, a ekran ${screenLandscape ? 'poziomy' : 'pionowy'}. Przełącz orientację (Ctrl+1 / Ctrl+2) lub obróć ekran.`, { timeout: 7000 });
    }
    const scale = Math.min(3, Math.max(0.25, presentationScale(format, display)));
    try {
      const dataUrl = await renderPoster(editor, store, { orientation: doc.orientation, scale });
      await api.present({ dataUrl, displayId: display.id });
    } catch (err) {
      toast(`Nie udało się uruchomić pokazu: ${err.message}`, { type: 'error' });
    }
  };
}
