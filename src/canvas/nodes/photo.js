import Konva from 'konva';
import { coverRect, buildCssFilter } from '../../core/image.js';
import { mix } from '../../core/colors.js';
import { tracePhotoShape, shapeBounds } from '../shapes.js';

export const photoNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    group.add(new Konva.Shape({ name: 'shadow', listening: false }));
    const frame = new Konva.Group({ name: 'frame', listening: false });
    frame.add(new Konva.Rect({ name: 'placeholder-bg' }));
    frame.add(new Konva.Text({ name: 'placeholder-text', align: 'center', verticalAlign: 'middle', wrap: 'word', lineHeight: 1.3 }));
    frame.add(new Konva.Image({ name: 'img', visible: false }));
    group.add(frame);
    group.add(new Konva.Shape({ name: 'border', listening: false }));
  },

  update(group, el, box, ctx) {
    const { w, h } = box;
    const path = (c) => tracePhotoShape(c, el.shape, w, h, el.radius);
    const bounds = shapeBounds(el.shape, w, h);
    group.findOne('.hit').size({ width: w, height: h });

    const frame = group.findOne('.frame');
    frame.clipFunc(path);
    const imgNode = frame.findOne('.img');
    const phBg = frame.findOne('.placeholder-bg');
    const phText = frame.findOne('.placeholder-text');
    const img = ctx.image(el.assetId);

    if (img) {
      const longest = Math.max(img.naturalWidth, img.naturalHeight);
      const source = ctx.filtered(el.assetId, img, buildCssFilter(el.filters, longest));
      const r = coverRect(img.naturalWidth, img.naturalHeight, bounds.w, bounds.h, el.crop);
      imgNode.setAttrs({
        image: source,
        visible: true,
        x: el.flipX ? bounds.x + r.x + r.width : bounds.x + r.x,
        y: bounds.y + r.y,
        width: r.width,
        height: r.height,
        scaleX: el.flipX ? -1 : 1,
      });
      phBg.visible(false);
      phText.visible(false);
    } else {
      imgNode.visible(false);
      phBg.setAttrs({ visible: true, x: 0, y: 0, width: w, height: h, fill: mix(ctx.color('palette:bg2'), ctx.color('palette:text'), 0.1) });
      phText.setAttrs({
        visible: !ctx.exporting,
        x: bounds.x,
        y: bounds.y,
        width: bounds.w,
        height: bounds.h,
        padding: 16,
        text: el.assetId ? 'Wczytywanie zdjęcia…' : 'Kliknij dwukrotnie\nlub przeciągnij tutaj zdjęcie',
        fontSize: Math.max(14, Math.min(bounds.w, bounds.h) * 0.065),
        fontFamily: ctx.font('body'),
        fill: ctx.color('palette:muted'),
      });
    }

    const minSide = Math.min(w, h);
    group.findOne('.shadow').setAttrs({
      visible: !!el.shadow,
      sceneFunc: (c, shape) => {
        path(c);
        c.fillStrokeShape(shape);
      },
      fill: ctx.color('palette:bg'),
      shadowColor: 'rgba(0,0,0,0.6)',
      shadowBlur: minSide * 0.06,
      shadowOffset: { x: 0, y: minSide * 0.025 },
    });

    group.findOne('.border').setAttrs({
      visible: el.borderWidth > 0,
      sceneFunc: (c, shape) => {
        path(c);
        c.strokeShape(shape);
      },
      stroke: ctx.color(el.borderColor),
      strokeWidth: el.borderWidth,
    });
  },
};
