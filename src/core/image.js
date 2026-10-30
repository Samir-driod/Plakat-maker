import { IMAGE_MAX_SIDE, FILE_EXT } from './constants.js';

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function downscaleSize(w, h, maxSide = IMAGE_MAX_SIDE) {
  const longest = Math.max(w, h);
  if (longest <= maxSide) return { w, h, scaled: false };
  const s = maxSide / longest;
  return { w: Math.round(w * s), h: Math.round(h * s), scaled: true };
}

export function coverRect(imgW, imgH, boxW, boxH, crop = { zoom: 1, x: 0.5, y: 0.5 }) {
  const scale = Math.max(boxW / imgW, boxH / imgH) * Math.max(1, crop.zoom ?? 1);
  const width = imgW * scale;
  const height = imgH * scale;
  return {
    x: (boxW - width) * clamp01(crop.x ?? 0.5) || 0, // `|| 0` zamienia -0 na 0
    y: (boxH - height) * clamp01(crop.y ?? 0.5) || 0,
    width,
    height,
  };
}

export function containRect(imgW, imgH, boxW, boxH) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { x: (boxW - width) / 2, y: (boxH - height) / 2, width, height };
}

export function panCrop(crop, dx, dy, imgW, imgH, boxW, boxH) {
  const r = coverRect(imgW, imgH, boxW, boxH, crop);
  const overX = r.width - boxW;
  const overY = r.height - boxH;
  return {
    zoom: crop.zoom,
    x: overX > 0 ? clamp01(crop.x - dx / overX) : crop.x,
    y: overY > 0 ? clamp01(crop.y - dy / overY) : crop.y,
  };
}

export function buildCssFilter(f, imageMaxSide) {
  const parts = [];
  if (f.grayscale > 0) parts.push(`grayscale(${f.grayscale / 100})`);
  if (f.sepia > 0) parts.push(`sepia(${f.sepia / 100})`);
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness / 100})`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast / 100})`);
  if (f.saturation !== 100) parts.push(`saturate(${f.saturation / 100})`);
  if (f.blur > 0) parts.push(`blur(${Math.round((f.blur / 1000) * imageMaxSide)}px)`);
  return parts.length ? parts.join(' ') : 'none';
}

const extOf = (name) => String(name).split('.').pop().toLowerCase();
export const isImageFile = (name) => IMAGE_EXTENSIONS.includes(extOf(name));
export const isProjectFile = (name) => extOf(name) === FILE_EXT;
