import Konva from 'konva';
import { coverRect, containRect } from '../../core/image.js';
import { roundRectPath } from '../shapes.js';

export const imageNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    const frame = new Konva.Group({ name: 'frame', listening: false });
    frame.add(new Konva.Rect({ name: 'placeholder', dash: [12, 8] }));
    frame.add(new Konva.Text({ name: 'placeholder-text', align: 'center', verticalAlign: 'middle', text: 'Obraz — kliknij dwukrotnie' }));
    frame.add(new Konva.Image({ name: 'img', visible: false }));
    group.add(frame);
  },

  update(group, el, box, ctx) {
    const { w, h } = box;
    group.findOne('.hit').size({ width: w, height: h });
    const frame = group.findOne('.frame');
    frame.clipFunc((c) => {
      c.beginPath();
      roundRectPath(c, 0, 0, w, h, el.radius);
    });
    frame.opacity(el.opacity);
    const imgNode = frame.findOne('.img');
    const ph = frame.findOne('.placeholder');
    const phText = frame.findOne('.placeholder-text');
    const img = ctx.image(el.assetId);
    if (img) {
      const r = el.fit === 'cover'
        ? coverRect(img.naturalWidth, img.naturalHeight, w, h)
        : containRect(img.naturalWidth, img.naturalHeight, w, h);
      imgNode.setAttrs({ image: ctx.filtered(el.assetId, img, 'none'), visible: true, x: r.x, y: r.y, width: r.width, height: r.height });
      ph.visible(false);
      phText.visible(false);
    } else {
      imgNode.visible(false);
      ph.setAttrs({ visible: !ctx.exporting, width: w, height: h, stroke: ctx.color('palette:muted'), strokeWidth: 3, fill: 'rgba(0,0,0,0.08)' });
      phText.setAttrs({ visible: !ctx.exporting, width: w, height: h, fontSize: Math.max(12, Math.min(w, h) * 0.08), fontFamily: ctx.font('body'), fill: ctx.color('palette:muted') });
    }
  },
};
