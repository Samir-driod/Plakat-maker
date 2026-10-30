import Konva from 'konva';

export const shapeNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    group.add(new Konva.Rect({ name: 'rect', listening: false }));
    group.add(new Konva.Ellipse({ name: 'ellipse', listening: false }));
    group.add(new Konva.Line({ name: 'line', listening: false, lineCap: 'round' }));
  },

  update(group, el, box, ctx) {
    const { w, h } = box;
    group.findOne('.hit').size({ width: w, height: h });
    const fill = ctx.color(el.fill);
    const stroke = ctx.color(el.stroke);
    const strokeWidth = el.strokeWidth;
    const common = { fill, stroke, strokeWidth, strokeEnabled: strokeWidth > 0, opacity: el.opacity };
    group.findOne('.rect').setAttrs({
      ...common,
      visible: el.shape === 'rect',
      width: w,
      height: h,
      cornerRadius: Math.min(el.radius, w / 2, h / 2),
    });
    group.findOne('.ellipse').setAttrs({
      ...common,
      visible: el.shape === 'ellipse',
      x: w / 2,
      y: h / 2,
      radiusX: w / 2,
      radiusY: h / 2,
    });
    group.findOne('.line').setAttrs({
      visible: el.shape === 'line',
      points: [h / 2, h / 2, Math.max(h / 2, w - h / 2), h / 2],
      stroke: fill,
      strokeWidth: h,
      opacity: el.opacity,
    });
  },
};
