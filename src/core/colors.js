const HEX6 = /^#[0-9a-f]{6}$/;
const HEX3 = /^#[0-9a-f]{3}$/;

export function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  let s = value.trim().toLowerCase();
  if (HEX3.test(s)) s = '#' + s.slice(1).split('').map((c) => c + c).join('');
  return HEX6.test(s) ? s : null;
}

export function hexToRgb(hex) {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }) {
  const c = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function readableOn(bg, light = '#ffffff', dark = '#111111') {
  return contrastRatio(bg, light) >= contrastRatio(bg, dark) ? light : dark;
}

export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex({ r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t });
}

export function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function extractPalette(pixels, { maxColors = 5, maxSamples = 20000, minDistance = 48 } = {}) {
  const total = Math.floor(pixels.length / 4);
  const step = Math.max(1, Math.floor(total / maxSamples));
  const buckets = new Map();
  for (let i = 0; i < total; i += step) {
    const o = i * 4;
    if (pixels[o + 3] < 128) continue;
    const r = pixels[o];
    const g = pixels[o + 1];
    const b = pixels[o + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { n: 0, r: 0, g: 0, b: 0 };
      buckets.set(key, bucket);
    }
    bucket.n++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
  }
  const sorted = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .map((bk) => ({ r: bk.r / bk.n, g: bk.g / bk.n, b: bk.b / bk.n }));
  const picked = [];
  for (const c of sorted) {
    if (picked.every((p) => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) >= minDistance)) picked.push(c);
    if (picked.length >= maxColors) break;
  }
  return picked.map(rgbToHex);
}

export function paletteFromImage(pixels) {
  const colors = extractPalette(pixels, { maxColors: 8 });
  if (!colors.length) return null;
  const scored = colors.map((hex) => {
    const hsl = rgbToHsl(hexToRgb(hex));
    return { hex, hsl, score: hsl.s * (1 - Math.abs(hsl.l - 0.5) * 1.2) };
  });
  const accentBase = scored.reduce((a, b) => (b.score > a.score ? b : a)).hex;
  const darkest = scored.reduce((a, b) => (b.hsl.l < a.hsl.l ? b : a)).hex;
  const bg = mix(darkest, '#000000', 0.55);
  const text = readableOn(bg);
  let accent = accentBase;
  for (let i = 0; i < 10 && contrastRatio(accent, bg) < 3; i++) accent = mix(accent, '#ffffff', 0.15);
  return { bg, bg2: mix(bg, accent, 0.25), accent, text, muted: mix(text, bg, 0.35) };
}
