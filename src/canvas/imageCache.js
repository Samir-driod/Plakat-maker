import { collectAssetIds } from '../core/schema.js';

const PREVIEW_MAX = 1600;
const MAX_FILTERED = 24;
const images = new Map();
const filtered = new Map();
let onChange = () => {};

export function setImageChangeHandler(fn) {
  onChange = fn;
}

function entryFor(assetId, asset) {
  let entry = images.get(assetId);
  if (!entry || entry.src !== asset.dataUrl) {
    const img = new Image();
    entry = { img, src: asset.dataUrl, ready: false, failed: false, promise: null };
    entry.promise = new Promise((resolve) => {
      img.onload = () => {
        entry.ready = true;
        resolve();
        onChange();
      };
      img.onerror = () => {
        entry.failed = true;
        console.warn('Nie udało się wczytać obrazu', assetId);
        resolve();
        onChange();
      };
    });
    img.src = asset.dataUrl;
    images.set(assetId, entry);
  }
  return entry;
}

export function getImage(assetId, asset) {
  if (!assetId || !asset) return null;
  const entry = entryFor(assetId, asset);
  return entry.ready ? entry.img : null;
}

export function whenImagesReady(doc, assets) {
  const jobs = [];
  for (const id of collectAssetIds(doc)) if (assets[id]) jobs.push(entryFor(id, assets[id]).promise);
  return Promise.all(jobs).then(() => undefined);
}

export function getFiltered(assetId, img, filter, quality = 'preview') {
  if (!img) return null;
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const downscale = quality === 'preview' && longest > PREVIEW_MAX;
  if (filter === 'none' && !downscale) return img;
  const key = `${assetId}|${filter}|${quality}`;
  const cached = filtered.get(key);
  if (cached) {
    filtered.delete(key);
    filtered.set(key, cached);
    return cached;
  }
  const s = downscale ? PREVIEW_MAX / longest : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * s));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * s));
  const effective = s === 1 ? filter : filter.replace(/blur\(([\d.]+)px\)/g, (_, v) => `blur(${(Number(v) * s).toFixed(2)}px)`);
  const c2d = canvas.getContext('2d');
  if (effective.includes('blur(')) c2d.drawImage(img, 0, 0, canvas.width, canvas.height);
  c2d.filter = effective;
  c2d.drawImage(img, 0, 0, canvas.width, canvas.height);
  filtered.set(key, canvas);
  if (filtered.size > MAX_FILTERED) filtered.delete(filtered.keys().next().value);
  return canvas;
}
