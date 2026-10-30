export function fitFontSize(measure, { maxSize, minSize = 8, boxWidth = Infinity, boxHeight }) {
  const fits = (size) => {
    const m = measure(size);
    return m.height <= boxHeight + 0.5 && m.width <= boxWidth + 0.5;
  };
  if (fits(maxSize)) return maxSize;
  if (!fits(minSize)) return minSize;
  let lo = minSize;
  let hi = maxSize;
  while (hi - lo > 0.25) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  let size = Math.max(minSize, Math.floor(lo));
  while (size + 1 <= maxSize && fits(size + 1)) size++;
  return size;
}

export function layoutPoints(heights, { gap, boxHeight = 0, distribute = 'top' }) {
  const n = heights.length;
  if (!n) return { ys: [], total: 0 };
  const sum = heights.reduce((a, b) => a + b, 0);
  let g = gap;
  if (distribute === 'spread' && n > 1 && boxHeight > sum + gap * (n - 1)) g = (boxHeight - sum) / (n - 1);
  const ys = [];
  let y = 0;
  for (const h of heights) {
    ys.push(y);
    y += h + g;
  }
  return { ys, total: sum + g * (n - 1) };
}

export function fitPoints(measureItem, count, { maxSize, minSize = 8, spacing, boxHeight }) {
  return fitFontSize(
    (size) => {
      let total = 0;
      for (let i = 0; i < count; i++) total += measureItem(i, size);
      return { width: 0, height: total + size * spacing * Math.max(0, count - 1) };
    },
    { maxSize, minSize, boxHeight },
  );
}
