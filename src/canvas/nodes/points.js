import Konva from 'konva';
import { fitPoints, layoutPoints } from '../../core/textfit.js';
import { fontStyleString } from '../../core/fonts.js';
import { BULLETS } from '../../core/constants.js';

function bulletChar(el, index) {
  if (el.bullet === 'number') return `${index + 1}.`;
  if (el.bullet === 'custom') return el.customBullet || '•';
  return BULLETS[el.bullet]?.char ?? '•';
}

export const pointsNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    group.add(new Konva.Group({ name: 'items', listening: false }));
  },

  update(group, el, box, ctx) {
    group.findOne('.hit').size({ width: box.w, height: box.h });
    const items = group.findOne('.items');
    items.destroyChildren();
    const texts = el.items.map((t) => t.trim()).filter(Boolean);
    if (!texts.length) return;

    const fontFamily = ctx.font(el.font);
    const fontStyle = fontStyleString({ bold: el.bold });
    const digits = String(texts.length).length;
    const bulletWidth = (s) => (el.bullet === 'number' ? s * (digits * 0.62 + 0.8) : s * 1.25);
    const probe = new Konva.Text({ fontFamily, fontStyle, lineHeight: el.lineHeight, wrap: 'word' });
    const measureItem = (i, s) => {
      probe.setAttrs({ text: texts[i], fontSize: s, width: Math.max(10, box.w - bulletWidth(s)) });
      return probe.height();
    };

    const size = el.autoFit
      ? fitPoints(measureItem, texts.length, { maxSize: el.size, minSize: 8, spacing: el.spacing, boxHeight: box.h })
      : el.size;
    const heights = texts.map((_, i) => measureItem(i, size));
    const { ys } = layoutPoints(heights, { gap: size * el.spacing, boxHeight: box.h, distribute: el.distribute });
    probe.destroy();

    const bw = bulletWidth(size);
    const bulletSize = el.bullet === 'dot' ? size * 0.7 : size;
    const bulletOffset = ((size - bulletSize) * el.lineHeight) / 2;
    texts.forEach((text, i) => {
      items.add(new Konva.Text({
        x: 0,
        y: ys[i] + bulletOffset,
        width: bw,
        text: bulletChar(el, i),
        fontFamily,
        fontStyle: 'bold',
        fontSize: bulletSize,
        lineHeight: el.lineHeight,
        fill: ctx.color(el.bulletColor),
      }));
      items.add(new Konva.Text({
        x: bw,
        y: ys[i],
        width: Math.max(10, box.w - bw),
        text,
        fontFamily,
        fontStyle,
        fontSize: size,
        lineHeight: el.lineHeight,
        wrap: 'word',
        fill: ctx.color(el.color),
      }));
    });
  },
};
