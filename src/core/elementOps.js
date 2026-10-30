import { ORIENTATIONS, MIN_BOX } from './constants.js';
import { createElement, TYPE_NAMES } from './model.js';
import { newId } from './ids.js';

function uniqueName(doc, base) {
  const names = new Set(Object.values(doc.elements).map((e) => e.name));
  if (!names.has(base)) return base;
  for (let i = 2; ; i++) if (!names.has(`${base} ${i}`)) return `${base} ${i}`;
}

function defaultSize(type, el, format) {
  const square = (k) => {
    const s = Math.round(Math.min(format.w, format.h) * k);
    return [s, s];
  };
  if (type === 'shape' && el.shape === 'line') return [Math.round(format.w * 0.3), 24];
  if (type === 'shape' || type === 'image') return square(0.25);
  if (type === 'qr') return square(0.22);
  if (type === 'photo') return [Math.round(format.w * 0.3), Math.round(format.h * 0.4)];
  if (type === 'points') return [Math.round(format.w * 0.4), Math.round(format.h * 0.3)];
  return [Math.round(format.w * 0.4), Math.round(format.h * 0.2)];
}

export function addElement(doc, type, { overrides = {}, at = null } = {}) {
  const el = createElement(type, 'free', overrides);
  el.name = uniqueName(doc, TYPE_NAMES[type]);
  for (const o of ORIENTATIONS) {
    const format = doc.formats[o];
    const [w, h] = defaultSize(type, el, format);
    let x = Math.round((format.w - w) / 2);
    let y = Math.round((format.h - h) / 2);
    if (at && o === doc.orientation) {
      x = Math.round(at.x - w / 2);
      y = Math.round(at.y - h / 2);
    }
    doc.boxes[o][el.id] = { x, y, w, h, rotation: 0, hidden: false };
  }
  doc.elements[el.id] = el;
  doc.order.push(el.id);
  return el.id;
}

export function duplicateElements(doc, ids, offset = 24) {
  const selected = doc.order.filter((id) => ids.includes(id));
  const created = [];
  for (const id of selected) {
    const src = doc.elements[id];
    const copy = structuredClone(src);
    copy.id = newId(src.type);
    copy.role = 'free';
    copy.name = uniqueName(doc, `${src.name} (kopia)`);
    copy.locked = false;
    doc.elements[copy.id] = copy;
    for (const o of ORIENTATIONS) {
      const b = doc.boxes[o][id];
      if (b) doc.boxes[o][copy.id] = { ...b, x: b.x + offset, y: b.y + offset };
    }
    doc.order.splice(doc.order.indexOf(id) + 1, 0, copy.id);
    created.push(copy.id);
  }
  return created;
}

export function deleteElements(doc, ids) {
  let count = 0;
  for (const id of ids) {
    if (!doc.elements[id]) continue;
    delete doc.elements[id];
    for (const o of ORIENTATIONS) delete doc.boxes[o][id];
    count++;
  }
  doc.order = doc.order.filter((id) => doc.elements[id]);
  return count;
}

export function reorder(doc, ids, mode) {
  const sel = new Set(ids);
  let order = [...doc.order];
  if (mode === 'front') {
    order = [...order.filter((id) => !sel.has(id)), ...order.filter((id) => sel.has(id))];
  } else if (mode === 'back') {
    order = [...order.filter((id) => sel.has(id)), ...order.filter((id) => !sel.has(id))];
  } else if (mode === 'forward') {
    for (let i = order.length - 2; i >= 0; i--) {
      if (sel.has(order[i]) && !sel.has(order[i + 1])) [order[i], order[i + 1]] = [order[i + 1], order[i]];
    }
  } else if (mode === 'backward') {
    for (let i = 1; i < order.length; i++) {
      if (sel.has(order[i]) && !sel.has(order[i - 1])) [order[i], order[i - 1]] = [order[i - 1], order[i]];
    }
  }
  const changed = order.some((id, i) => id !== doc.order[i]);
  doc.order = order;
  return changed;
}

export function nudge(doc, ids, dx, dy, orientation = doc.orientation) {
  let changed = false;
  for (const id of ids) {
    const b = doc.boxes[orientation][id];
    if (!b || doc.elements[id]?.locked) continue;
    b.x += dx;
    b.y += dy;
    changed = true;
  }
  return changed;
}

export function setBox(doc, id, patch, orientation = doc.orientation) {
  const b = doc.boxes[orientation][id];
  if (!b) return;
  for (const key of ['x', 'y', 'w', 'h', 'rotation']) {
    if (key in patch && Number.isFinite(patch[key])) b[key] = patch[key];
  }
  if ('hidden' in patch) b.hidden = patch.hidden === true;
  b.w = Math.max(MIN_BOX, b.w);
  b.h = Math.max(MIN_BOX, b.h);
}

export function toggleHidden(doc, ids, orientation = doc.orientation) {
  const boxes = ids.map((id) => doc.boxes[orientation][id]).filter(Boolean);
  const hide = boxes.some((b) => !b.hidden);
  for (const b of boxes) b.hidden = hide;
}

export function setLocked(doc, ids, locked) {
  for (const id of ids) if (doc.elements[id]) doc.elements[id].locked = locked;
}

export function renameElement(doc, id, name) {
  const clean = String(name ?? '').trim().slice(0, 80);
  if (!clean || !doc.elements[id]) return false;
  doc.elements[id].name = clean;
  return true;
}
