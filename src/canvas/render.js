import Konva from 'konva';
import { NODE_TYPES } from './nodes/index.js';
import { backgroundNode } from './nodes/background.js';
import { resolveColor, resolveFont } from '../core/model.js';
import { getImage, getFiltered } from './imageCache.js';

export function createRenderer(posterGroup, { quality = () => 'preview' } = {}) {
  const entries = new Map();
  const bg = new Konva.Group({ name: 'background-group' });
  posterGroup.add(bg);
  backgroundNode.create(bg);

  function makeCtx(doc, assets) {
    return {
      doc,
      color: (value, fallback) => resolveColor(doc, value, fallback),
      font: (value) => resolveFont(doc, value),
      image: (assetId) => getImage(assetId, assets[assetId]),
      asset: (assetId) => assets[assetId] ?? null,
      filtered: (assetId, img, filter) => getFiltered(assetId, img, filter, quality()),
      exporting: quality() === 'full',
    };
  }

  function render(doc, assets) {
    const fmt = doc.formats[doc.orientation];
    posterGroup.clip({ x: 0, y: 0, width: fmt.w, height: fmt.h });
    const ctx = makeCtx(doc, assets);
    try {
      backgroundNode.update(bg, doc, fmt, ctx);
    } catch (err) {
      console.error('Błąd rysowania tła:', err);
    }
    const boxes = doc.boxes[doc.orientation];
    const seen = new Set();
    let z = 1;
    doc.order.forEach((id) => {
      const el = doc.elements[id];
      const impl = el && NODE_TYPES[el.type];
      if (!impl) return;
      let entry = entries.get(id);
      if (!entry || entry.type !== el.type) {
        entry?.group.destroy();
        const group = new Konva.Group({ id, name: 'element' });
        impl.create(group);
        posterGroup.add(group);
        entry = { group, type: el.type };
        entries.set(id, entry);
      }
      const box = boxes[id];
      const { group } = entry;
      group.visible(!!box && !box.hidden);
      if (box) {
        group.setAttrs({ x: box.x, y: box.y, rotation: box.rotation, scaleX: 1, scaleY: 1, boxW: box.w, boxH: box.h });
        try {
          impl.update(group, el, box, ctx);
        } catch (err) {
          console.error(`Błąd rysowania elementu „${el.name}”:`, err);
        }
      }
      group.zIndex(z++);
      seen.add(id);
    });
    for (const [id, entry] of entries) {
      if (!seen.has(id)) {
        entry.group.destroy();
        entries.delete(id);
      }
    }
  }

  return {
    render,
    groupFor: (id) => entries.get(id)?.group ?? null,
    liveUpdate(id, doc, assets, box) {
      const el = doc.elements[id];
      const entry = entries.get(id);
      if (!el || !entry) return;
      entry.group.setAttrs({ boxW: box.w, boxH: box.h });
      NODE_TYPES[el.type].update(entry.group, el, box, makeCtx(doc, assets));
    },
    reset() {
      for (const entry of entries.values()) entry.group.destroy();
      entries.clear();
    },
  };
}
