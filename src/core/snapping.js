import { SAFE_AREA } from './constants.js';

export function snapTargets(boxes, format, { safeArea = SAFE_AREA } = {}) {
  const xs = [0, format.w / 2, format.w];
  const ys = [0, format.h / 2, format.h];
  if (safeArea > 0) {
    xs.push(format.w * safeArea, format.w * (1 - safeArea));
    ys.push(format.h * safeArea, format.h * (1 - safeArea));
  }
  for (const b of boxes) {
    xs.push(b.x, b.x + b.w / 2, b.x + b.w);
    ys.push(b.y, b.y + b.h / 2, b.y + b.h);
  }
  return { xs, ys };
}

function nearest(edges, targets, threshold) {
  let result = null;
  for (const e of edges) {
    for (const t of targets) {
      const delta = t - e;
      if (Math.abs(delta) <= threshold && (!result || Math.abs(delta) < Math.abs(result.delta))) {
        result = { delta, guide: t };
      }
    }
  }
  return result;
}

export function computeSnap(box, targets, threshold) {
  const x = nearest([box.x, box.x + box.w / 2, box.x + box.w], targets.xs, threshold);
  const y = nearest([box.y, box.y + box.h / 2, box.y + box.h], targets.ys, threshold);
  return { dx: x?.delta ?? 0, dy: y?.delta ?? 0, guideX: x?.guide ?? null, guideY: y?.guide ?? null };
}
