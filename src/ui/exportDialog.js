import { h } from './dom.js';
import { segmented, selectField, slider } from './controls.js';
import { openModal, toast } from './dialogs.js';
import { EXPORT_SCALES, exportDims } from '../core/exportSizes.js';
import { findByRole } from '../core/document.js';
import { qrValidationError } from '../core/qr.js';
import { exportPoster, renderPoster } from '../canvas/exporter.js';

export function preflightWarnings(doc) {
  const warnings = [];
  for (const o of ['landscape', 'portrait']) {
    const photo = findByRole(doc, 'photo');
    if (photo && !photo.assetId && !doc.boxes[o][photo.id]?.hidden) {
      warnings.push('Nie dodano zdjęcia, w jego miejscu będzie puste tło ramki.');
      break;
    }
  }
  for (const el of Object.values(doc.elements)) {
    if (el.type === 'qr' && qrValidationError(el.kind, el.data)) {
      warnings.push(`„${el.name}”: ${qrValidationError(el.kind, el.data)} Kod nie pojawi się na plakacie.`);
    }
  }
  const title = findByRole(doc, 'title');
  if (title && title.text === 'Twój tytuł') warnings.push('Tytuł ma nadal tekst przykładowy.');
  return warnings;
}

export function installExport(app) {
  const { store, settings, api } = app;
  if (!api.saveExport) return;

  async function copyToClipboard() {
    try {
      const dataUrl = await renderPoster(app.editor, store, { orientation: store.doc.orientation, scale: 1 });
      await api.copyImage(dataUrl);
      toast('Skopiowano plakat do schowka. Możesz go wkleić np. w Wordzie albo na Messengerze.', { type: 'success' });
    } catch (err) {
      toast(`Nie udało się skopiować: ${err.message}`, { type: 'error' });
    }
  }

  function openExport() {
    const values = {
      format: settings.get('exportFormat'),
      scale: settings.get('exportScale'),
      orientation: settings.get('exportOrientation'),
      jpgQuality: settings.get('jpgQuality'),
      pdfMode: settings.get('pdfMode'),
    };
    const doc = store.doc;
    const format = segmented({
      label: 'Format pliku',
      options: [{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'pdf', label: 'PDF' }],
      testId: 'export-format',
    });
    const orientation = segmented({
      label: 'Orientacja',
      options: [
        { value: 'current', label: 'Bieżąca' },
        { value: 'landscape', label: 'Pozioma' },
        { value: 'portrait', label: 'Pionowa' },
        { value: 'both', label: 'Obie' },
      ],
      testId: 'export-orientation',
    });
    const scale = selectField({ label: 'Rozdzielczość', options: [], testId: 'export-scale' });
    const quality = slider({ label: 'Jakość JPG', min: 0.6, max: 1, step: 0.02, format: (v) => Math.round(v * 100), unit: '%' });
    const pdfMode = selectField({
      label: 'Strona PDF',
      options: [{ value: 'screen', label: 'Rozmiar ekranu (jak obraz)' }, { value: 'a4', label: 'A4 do druku (z marginesem)' }],
    });
    const preview = h('img', { class: 'thumb', style: { height: '160px', objectFit: 'contain', background: '#0d0f13' }, alt: 'Podgląd' });
    const busy = h('p', { class: 'hint' });

    function refresh() {
      format.set(values.format);
      orientation.set(values.orientation);
      const o = values.orientation === 'current' || values.orientation === 'both' ? doc.orientation : values.orientation;
      scale.input.replaceChildren(...EXPORT_SCALES.map((s) => {
        const d = exportDims(doc.formats[o], s.value);
        return h('option', { value: String(s.value) }, `${s.label}: ${d.width} × ${d.height} px`);
      }));
      scale.set(values.scale);
      quality.set(values.jpgQuality);
      pdfMode.set(values.pdfMode);
      quality.el.hidden = values.format !== 'jpg';
      pdfMode.el.hidden = values.format !== 'pdf';
    }
    format.onChange((v) => { values.format = v; refresh(); });
    orientation.onChange((v) => { values.orientation = v; refresh(); });
    scale.onChange((v) => { values.scale = Number(v); });
    quality.onChange((v) => { values.jpgQuality = v; });
    pdfMode.onChange((v) => { values.pdfMode = v; });
    refresh();

    renderPoster(app.editor, store, { orientation: doc.orientation, scale: 320 / doc.formats[doc.orientation].w, mime: 'image/jpeg', quality: 0.8 })
      .then((url) => { preview.src = url; })
      .catch(() => {});

    const warnings = preflightWarnings(doc);
    const modal = openModal({
      title: 'Eksport plakatu',
      body: h('div', {},
        preview,
        warnings.map((w) => h('p', { class: 'warning' }, `⚠ ${w}`)),
        h('div', { class: 'two-col' }, h('div', {}, format.el, scale.el), h('div', {}, orientation.el, quality.el, pdfMode.el)),
        h('p', { class: 'hint' }, 'Na telewizor lub monitor Full HD wystarczy 1×. Dla ekranów 4K wybierz 2×. „Obie” zapisze wersję poziomą i pionową naraz.'),
        busy),
      actions: [
        { id: 'copy', label: 'Kopiuj do schowka', testId: 'export-copy', onClick: () => copyToClipboard() },
        { id: null, label: 'Anuluj' },
        {
          id: 'export',
          label: 'Eksportuj',
          kind: 'primary',
          testId: 'export-confirm',
          onClick: async (m) => {
            busy.textContent = 'Przygotowuję plik…';
            m.element.querySelectorAll('button').forEach((b) => { b.disabled = true; });
            await settings.set({
              exportFormat: values.format,
              exportScale: values.scale,
              exportOrientation: values.orientation,
              jpgQuality: values.jpgQuality,
              pdfMode: values.pdfMode,
            });
            try {
              const saved = await exportPoster(app, values);
              m.close('done');
              if (saved) {
                const many = values.orientation === 'both' && values.format !== 'pdf';
                const name = saved.split(/[\\/]/).pop();
                toast(many ? `Zapisano 2 pliki w folderze „${name}”` : `Zapisano: ${name}`, {
                  type: 'success',
                  timeout: 7000,
                  action: { label: 'Pokaż w folderze', onClick: () => api.showItemInFolder(saved) },
                });
              }
            } catch (err) {
              m.close('error');
              toast(`Eksport nie powiódł się: ${err.message}`, { type: 'error', timeout: 8000 });
            }
          },
        },
      ],
    });
    return modal;
  }

  app.actions.openExport = openExport;
  app.actions.copyToClipboard = copyToClipboard;
}
