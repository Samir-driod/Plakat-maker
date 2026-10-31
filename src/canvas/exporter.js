import { jsPDF } from 'jspdf';
import { pdfPage, exportFileName, sanitizeFileName } from '../core/exportSizes.js';
import { whenImagesReady } from './imageCache.js';

export function dataUrlToBytes(dataUrl) {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function renderPoster(editor, store, { orientation, scale = 1, mime = 'image/png', quality = 0.92 }) {
  const doc = { ...store.doc, orientation };
  await whenImagesReady(doc, store.assets);
  await document.fonts.ready;
  const f = doc.formats[orientation];
  return editor.withExportView(
    (stage) => stage.toDataURL({ mimeType: mime, quality, pixelRatio: scale, x: 0, y: 0, width: f.w, height: f.h }),
    { doc, quality: 'full' },
  );
}

export function buildPdf(pages, mode, title) {
  let pdf = null;
  for (const p of pages) {
    const page = pdfPage(p.format, mode);
    const size = [page.pageW, page.pageH];
    if (!pdf) {
      pdf = new jsPDF({ unit: page.unit, format: size, orientation: page.orientation, compress: true, hotfixes: ['px_scaling'] });
    } else {
      pdf.addPage(size, page.orientation);
    }
    pdf.addImage(p.dataUrl, p.mime === 'image/png' ? 'PNG' : 'JPEG', page.x, page.y, page.w, page.h, undefined, 'FAST');
  }
  pdf.setProperties({ title, creator: 'Plakat Maker' });
  return new Uint8Array(pdf.output('arraybuffer'));
}

export async function exportPoster(app, { format, scale, orientation, jpgQuality, pdfMode }) {
  const { store, editor, api } = app;
  const orientations = orientation === 'both'
    ? ['landscape', 'portrait']
    : [orientation === 'current' ? store.doc.orientation : orientation];
  const name = store.doc.meta.name;
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'pdf' ? 0.95 : jpgQuality;
  const renders = [];
  for (const o of orientations) {
    renders.push({
      orientation: o,
      format: store.doc.formats[o],
      mime,
      dataUrl: await renderPoster(editor, store, { orientation: o, scale, mime, quality }),
    });
  }
  if (format === 'pdf') {
    const fileName = renders.length > 1 ? `${sanitizeFileName(name)}.pdf` : exportFileName(name, renders[0].orientation, 'pdf');
    return api.saveExport({ defaultName: fileName, ext: 'pdf', bytes: buildPdf(renders, pdfMode, name) });
  }
  if (renders.length === 1) {
    return api.saveExport({ defaultName: exportFileName(name, renders[0].orientation, format), ext: format, bytes: dataUrlToBytes(renders[0].dataUrl) });
  }
  return api.saveExportMany({
    files: renders.map((r) => ({ name: exportFileName(name, r.orientation, format), bytes: dataUrlToBytes(r.dataUrl) })),
  });
}
