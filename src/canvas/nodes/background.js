import Konva from 'konva';
import { coverRect, buildCssFilter } from '../../core/image.js';

const NEUTRAL = { grayscale: 0, sepia: 0, brightness: 100, contrast: 100, saturation: 100, blur: 0 };

function patternScene(kind, w, h, size, color) {
  const s = Math.max(8, size);
  return (ctx) => {
    ctx.beginPath();
    if (kind === 'dots') {
      const r = s * 0.09;
      for (let y = s / 2; y < h; y += s) {
        for (let x = s / 2; x < w; x += s) {
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.setAttr('fillStyle', color);
      ctx.fill();
      return;
    }
    if (kind === 'grid') {
      for (let x = 0; x <= w; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y <= h; y += s) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    } else if (kind === 'diagonal') {
      for (let x = -h; x < w; x += s) { ctx.moveTo(x, h); ctx.lineTo(x + h, 0); }
    } else if (kind === 'waves') {
      const amp = s * 0.18;
      for (let y = s / 2; y < h + s; y += s) {
        ctx.moveTo(0, y);
        for (let x = 0; x <= w + s / 8; x += s / 8) ctx.lineTo(x, y + Math.sin((x / s) * Math.PI * 2) * amp);
      }
    }
    ctx.setAttr('strokeStyle', color);
    ctx.setAttr('lineWidth', Math.max(1, s * 0.04));
    ctx.stroke();
  };
}

export const backgroundNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'background' }));
    group.add(new Konva.Image({ name: 'bg-image', listening: false, visible: false }));
    group.add(new Konva.Rect({ name: 'bg-dim', listening: false, visible: false }));
    group.add(new Konva.Shape({ name: 'bg-pattern', listening: false, visible: false }));
  },

  update(group, doc, fmt, ctx) {
    const { w, h } = fmt;
    const bg = doc.background;
    const c1 = ctx.color('palette:bg');
    const c2 = ctx.color('palette:bg2');
    const base = group.findOne('.background');
    base.setAttrs({ x: 0, y: 0, width: w, height: h, fill: c1, fillPriority: 'color' });

    if (bg.type === 'linear') {
      const rad = (bg.angle * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);
      const half = Math.abs((w / 2) * dx) + Math.abs((h / 2) * dy);
      base.setAttrs({
        fillPriority: 'linear-gradient',
        fillLinearGradientStartPoint: { x: w / 2 - dx * half, y: h / 2 - dy * half },
        fillLinearGradientEndPoint: { x: w / 2 + dx * half, y: h / 2 + dy * half },
        fillLinearGradientColorStops: [0, c1, 1, c2],
      });
    } else if (bg.type === 'radial') {
      base.setAttrs({
        fillPriority: 'radial-gradient',
        fillRadialGradientStartPoint: { x: w / 2, y: h / 2 },
        fillRadialGradientEndPoint: { x: w / 2, y: h / 2 },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndRadius: Math.hypot(w, h) / 2,
        fillRadialGradientColorStops: [0, c2, 1, c1],
      });
    }

    const imgNode = group.findOne('.bg-image');
    const dim = group.findOne('.bg-dim');
    const img = bg.type === 'image' ? ctx.image(bg.imageId) : null;
    if (img) {
      const longest = Math.max(img.naturalWidth, img.naturalHeight);
      const source = ctx.filtered(bg.imageId, img, buildCssFilter({ ...NEUTRAL, blur: bg.blur }, longest));
      const r = coverRect(img.naturalWidth, img.naturalHeight, w, h);
      imgNode.setAttrs({ image: source, x: r.x, y: r.y, width: r.width, height: r.height, visible: true });
      dim.setAttrs({ x: 0, y: 0, width: w, height: h, fill: c1, opacity: bg.dim, visible: bg.dim > 0 });
    } else {
      imgNode.visible(false);
      dim.visible(false);
    }

    const pattern = group.findOne('.bg-pattern');
    if (bg.type === 'pattern') {
      pattern.setAttrs({
        visible: true,
        opacity: bg.patternOpacity,
        sceneFunc: patternScene(bg.pattern, w, h, bg.patternSize, ctx.color(bg.patternColor)),
      });
    } else {
      pattern.visible(false);
    }
  },
};
