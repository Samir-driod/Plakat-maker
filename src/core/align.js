export function unionBox(boxes) {
  const x1 = Math.min(...boxes.map((b) => b.x));
  const y1 = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.w));
  const y2 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function alignBoxes(boxes, mode, bounds = null) {
  const ref = bounds ?? unionBox(boxes);
  return boxes.map((b) => {
    let { x, y } = b;
    if (mode === 'left') x = ref.x;
    if (mode === 'hcenter') x = ref.x + (ref.w - b.w) / 2;
    if (mode === 'right') x = ref.x + ref.w - b.w;
    if (mode === 'top') y = ref.y;
    if (mode === 'vcenter') y = ref.y + (ref.h - b.h) / 2;
    if (mode === 'bottom') y = ref.y + ref.h - b.h;
    return { id: b.id, x: Math.round(x), y: Math.round(y) };
  });
}

export function distributeBoxes(boxes, axis) {
  if (boxes.length < 3) return boxes.map((b) => ({ id: b.id, x: b.x, y: b.y }));
  const pos = axis === 'h' ? 'x' : 'y';
  const size = axis === 'h' ? 'w' : 'h';
  const sorted = [...boxes].sort((a, b) => a[pos] - b[pos]);
  const first = sorted[0];
  const last = sorted.at(-1);
  const span = last[pos] + last[size] - first[pos];
  const sum = sorted.reduce((acc, b) => acc + b[size], 0);
  const gap = (span - sum) / (sorted.length - 1);
  let cursor = first[pos];
  const placed = new Map();
  for (const b of sorted) {
    placed.set(b.id, Math.round(cursor));
    cursor += b[size] + gap;
  }
  return boxes.map((b) => ({ id: b.id, x: pos === 'x' ? placed.get(b.id) : b.x, y: pos === 'y' ? placed.get(b.id) : b.y }));
}
