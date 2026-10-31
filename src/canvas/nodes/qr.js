import Konva from 'konva';
import { buildQrPayload, qrValidationError, qrMatrix } from '../../core/qr.js';
import { roundRectPath } from '../shapes.js';
import { containRect } from '../../core/image.js';

const matrixCache = new Map();

function cachedMatrix(payload, ecl) {
  const key = `${ecl}|${payload}`;
  if (!matrixCache.has(key)) {
    matrixCache.set(key, qrMatrix(payload, ecl));
    if (matrixCache.size > 50) matrixCache.delete(matrixCache.keys().next().value);
  }
  return matrixCache.get(key);
}

const isFinder = (r, c, n) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

function drawFinder(ctx, x, y, cell, fg, bg) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, 7 * cell, 7 * cell, cell * 1.6);
  ctx.setAttr('fillStyle', fg);
  ctx.fill();
  ctx.beginPath();
  roundRectPath(ctx, x + cell, y + cell, 5 * cell, 5 * cell, cell * 1.1);
  ctx.setAttr('fillStyle', bg);
  ctx.fill();
  ctx.beginPath();
  roundRectPath(ctx, x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell, cell * 0.8);
  ctx.setAttr('fillStyle', fg);
  ctx.fill();
}

function drawCode(ctx, matrix, { size, margin, style, fg, bg }) {
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.setAttr('fillStyle', bg);
  ctx.fill();

  const n = matrix.size;
  const cell = size / (n + margin * 2);
  const off = margin * cell;
  const overlap = cell * 0.04;
  ctx.beginPath();
  for (let r = 0; r < n; r++) {
    if (style === 'square') {
      let c = 0;
      while (c < n) {
        if (!matrix.isDark(r, c)) {
          c++;
          continue;
        }
        let end = c;
        while (end < n && matrix.isDark(r, end)) end++;
        ctx.rect(off + c * cell, off + r * cell, (end - c) * cell + overlap, cell + overlap);
        c = end;
      }
    } else {
      for (let c = 0; c < n; c++) {
        if (!matrix.isDark(r, c) || isFinder(r, c, n)) continue;
        const x = off + c * cell;
        const y = off + r * cell;
        if (style === 'dots') {
          ctx.moveTo(x + cell * 0.95, y + cell / 2);
          ctx.arc(x + cell / 2, y + cell / 2, cell * 0.45, 0, Math.PI * 2);
        } else {
          roundRectPath(ctx, x + cell * 0.04, y + cell * 0.04, cell * 0.92, cell * 0.92, cell * 0.32);
        }
      }
    }
  }
  ctx.setAttr('fillStyle', fg);
  ctx.fill();
  if (style !== 'square') {
    for (const [fr, fc] of [[0, 0], [0, n - 7], [n - 7, 0]]) drawFinder(ctx, off + fc * cell, off + fr * cell, cell, fg, bg);
  }
}

export const qrNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    group.add(new Konva.Rect({ name: 'card', listening: false }));
    group.add(new Konva.Shape({ name: 'code', listening: false }));
    group.add(new Konva.Text({ name: 'placeholder', listening: false, align: 'center', verticalAlign: 'middle', wrap: 'word' }));
    group.add(new Konva.Rect({ name: 'logo-bg', listening: false }));
    group.add(new Konva.Image({ name: 'logo', listening: false }));
    group.add(new Konva.Text({ name: 'caption', listening: false, align: 'center', verticalAlign: 'middle', wrap: 'none', ellipsis: true }));
  },

  update(group, el, box, ctx) {
    const { w, h } = box;
    group.findOne('.hit').size({ width: w, height: h });
    const fg = ctx.color(el.fg, '#111111');
    const bg = ctx.color(el.bg, '#ffffff');
    const pad = el.card ? Math.min(w, h) * 0.07 : 0;
    const captionH = el.caption ? Math.max(16, Math.min(w, h) * 0.13) : 0;
    const size = Math.max(10, Math.min(w - pad * 2, h - pad * 2 - captionH));
    const cardW = size + pad * 2;
    const cardH = size + captionH + pad * 2;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;
    const codeX = cardX + pad;
    const codeY = cardY + pad;

    group.findOne('.card').setAttrs({
      visible: el.card,
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      fill: bg,
      cornerRadius: Math.min(el.cardRadius, cardW / 2, cardH / 2),
      shadowEnabled: false,
    });

    const error = qrValidationError(el.kind, el.data);
    const ecl = el.logoAssetId ? 'H' : el.ecl;
    const matrix = error ? null : cachedMatrix(buildQrPayload(el.kind, el.data), ecl);
    const code = group.findOne('.code');
    const placeholder = group.findOne('.placeholder');
    if (matrix) {
      code.setAttrs({
        visible: true,
        x: codeX,
        y: codeY,
        sceneFunc: (c) => drawCode(c, matrix, { size, margin: el.margin, style: el.moduleStyle, fg, bg }),
      });
      placeholder.visible(false);
    } else {
      code.visible(false);
      placeholder.setAttrs({
        visible: !ctx.exporting,
        x: codeX,
        y: codeY,
        width: size,
        height: size,
        padding: size * 0.08,
        text: error ?? 'Uzupełnij dane kodu QR',
        fontSize: Math.max(12, size * 0.08),
        fontFamily: ctx.font('body'),
        fill: '#888888',
      });
    }

    const logo = ctx.image(el.logoAssetId);
    const logoSize = size * 0.22;
    const logoPad = logoSize * 0.12;
    group.findOne('.logo-bg').setAttrs({
      visible: !!(logo && matrix),
      x: codeX + (size - logoSize) / 2 - logoPad,
      y: codeY + (size - logoSize) / 2 - logoPad,
      width: logoSize + logoPad * 2,
      height: logoSize + logoPad * 2,
      fill: bg,
      cornerRadius: logoPad * 1.5,
    });
    const r = logo ? containRect(logo.naturalWidth, logo.naturalHeight, logoSize, logoSize) : { x: 0, y: 0, width: logoSize, height: logoSize };
    group.findOne('.logo').setAttrs({
      visible: !!(logo && matrix),
      image: logo,
      x: codeX + (size - logoSize) / 2 + r.x,
      y: codeY + (size - logoSize) / 2 + r.y,
      width: r.width,
      height: r.height,
    });

    group.findOne('.caption').setAttrs({
      visible: !!el.caption,
      x: cardX,
      y: codeY + size,
      width: cardW,
      height: captionH,
      text: el.caption,
      fontSize: captionH * 0.6,
      fontStyle: 'bold',
      fontFamily: ctx.font('body'),
      fill: el.card ? ctx.color(el.captionColor, '#111111') : ctx.color('palette:text'),
    });
  },
};
