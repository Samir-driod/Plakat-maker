import Konva from 'konva';
import { fontStyleString } from '../../core/fonts.js';
import { fitFontSize } from '../../core/textfit.js';

export function applyTextStyle(node, el, ctx, size = el.size) {
  node.setAttrs({
    fontFamily: ctx.font(el.font),
    fontStyle: fontStyleString(el),
    fontSize: size,
    letterSpacing: el.letterSpacing ?? 0,
    lineHeight: el.lineHeight ?? 1.2,
    fill: ctx.color(el.color),
    stroke: ctx.color(el.strokeColor ?? '#000000'),
    strokeWidth: el.strokeWidth ?? 0,
    strokeEnabled: (el.strokeWidth ?? 0) > 0,
    fillAfterStrokeEnabled: true,
    shadowEnabled: !!el.shadow,
    shadowColor: 'rgba(0,0,0,0.55)',
    shadowBlur: size * 0.18,
    shadowOffset: { x: 0, y: size * 0.06 },
  });
}

export function displayText(el) {
  return el.uppercase ? el.text.toLocaleUpperCase('pl-PL') : el.text;
}

export const textNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    group.add(new Konva.Text({ name: 'label', wrap: 'word', listening: false }));
  },

  update(group, el, box, ctx) {
    group.findOne('.hit').size({ width: box.w, height: box.h });
    const label = group.findOne('.label');
    label.setAttrs({ text: displayText(el), width: box.w, align: el.align, x: 0, y: 0 });
    label.setAttr('height', undefined);
    applyTextStyle(label, el, ctx);
    let size = el.size;
    if (el.autoFit) {
      size = fitFontSize((s) => {
        label.fontSize(s);
        return { width: 0, height: label.height() };
      }, { maxSize: el.size, minSize: 8, boxHeight: box.h });
      applyTextStyle(label, el, ctx, size);
    }
    const textHeight = label.height();
    let y = 0;
    if (el.valign === 'middle') y = (box.h - textHeight) / 2;
    if (el.valign === 'bottom') y = box.h - textHeight;
    label.y(y);
  },
};
