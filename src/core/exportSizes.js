export const EXPORT_SCALES = [
  { value: 1, label: '1× (rozmiar projektu)' },
  { value: 2, label: '2× (np. 4K)' },
  { value: 3, label: '3× (bardzo duży)' },
];

export function exportDims(format, scale) {
  const s = EXPORT_SCALES.some((e) => e.value === scale) ? scale : 1;
  return { width: Math.round(format.w * s), height: Math.round(format.h * s), pixelRatio: s };
}

export function pdfPage(format, mode) {
  const landscape = format.w >= format.h;
  const orientation = landscape ? 'landscape' : 'portrait';
  if (mode === 'a4') {
    const pageW = landscape ? 297 : 210;
    const pageH = landscape ? 210 : 297;
    const margin = 10;
    const s = Math.min((pageW - 2 * margin) / format.w, (pageH - 2 * margin) / format.h);
    const w = format.w * s;
    const h = format.h * s;
    return { unit: 'mm', orientation, pageW, pageH, x: (pageW - w) / 2, y: (pageH - h) / 2, w, h };
  }
  return { unit: 'px', orientation, pageW: format.w, pageH: format.h, x: 0, y: 0, w: format.w, h: format.h };
}

export function sanitizeFileName(name) {
  let s = String(name ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  if (!s) return 'plakat';
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(s)) s += '_';
  return s.slice(0, 120);
}

export function exportFileName(name, orientation, ext) {
  return `${sanitizeFileName(name)}-${orientation === 'portrait' ? 'pionowo' : 'poziomo'}.${ext}`;
}

export function presentationScale(format, display) {
  const pw = display.width * display.scaleFactor;
  const ph = display.height * display.scaleFactor;
  return Math.min(pw / format.w, ph / format.h);
}
