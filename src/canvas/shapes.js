export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function shapeBounds(shape, w, h) {
  if (shape === 'circle') {
    const d = Math.min(w, h);
    return { x: (w - d) / 2, y: (h - d) / 2, w: d, h: d };
  }
  return { x: 0, y: 0, w, h };
}

export function tracePhotoShape(ctx, shape, w, h, radius = 0) {
  ctx.beginPath();
  switch (shape) {
    case 'circle': {
      const b = shapeBounds(shape, w, h);
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
      ctx.closePath();
      break;
    }
    case 'rounded':
      roundRectPath(ctx, 0, 0, w, h, radius);
      break;
    case 'arch': {
      const r = w / 2;
      if (h < r) {
        roundRectPath(ctx, 0, 0, w, h, h / 2);
        break;
      }
      ctx.moveTo(0, h);
      ctx.lineTo(0, r);
      ctx.arc(r, r, r, Math.PI, 0, false);
      ctx.lineTo(w, h);
      ctx.closePath();
      break;
    }
    case 'hexagon':
      ctx.moveTo(w * 0.25, 0);
      ctx.lineTo(w * 0.75, 0);
      ctx.lineTo(w, h / 2);
      ctx.lineTo(w * 0.75, h);
      ctx.lineTo(w * 0.25, h);
      ctx.lineTo(0, h / 2);
      ctx.closePath();
      break;
    default:
      ctx.rect(0, 0, w, h);
  }
}
