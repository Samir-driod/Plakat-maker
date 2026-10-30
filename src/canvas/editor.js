import Konva from 'konva';
import { createRenderer } from './render.js';
import { setImageChangeHandler } from './imageCache.js';
import { ensureFontsForDoc } from './fontLoader.js';

const PAD = 40;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;

export function createEditor({ container, store }) {
  const stage = new Konva.Stage({ container, width: container.clientWidth || 800, height: container.clientHeight || 600 });
  const posterLayer = new Konva.Layer();
  const uiLayer = new Konva.Layer();
  stage.add(posterLayer, uiLayer);

  const shadow = new Konva.Rect({ fill: '#000', shadowColor: '#000', shadowBlur: 40, shadowOpacity: 0.55, listening: false });
  const posterGroup = new Konva.Group({ name: 'poster' });
  posterLayer.add(shadow, posterGroup);

  let quality = 'preview';
  const renderer = createRenderer(posterGroup, { quality: () => quality });
  const listeners = { view: new Set(), rendered: new Set() };
  let view = { scale: 1, x: 0, y: 0, mode: 'fit' };
  let frame = 0;
  let interacting = false;
  let pendingWhileInteracting = false;

  const format = () => store.doc.formats[store.doc.orientation];
  const emit = (name, payload) => listeners[name].forEach((fn) => fn(payload));

  function applyView() {
    stage.scale({ x: view.scale, y: view.scale });
    stage.position({ x: view.x, y: view.y });
    stage.batchDraw();
    emit('view', view);
  }

  function fit() {
    const f = format();
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.max(MIN_ZOOM, Math.min((cw - PAD * 2) / f.w, (ch - PAD * 2) / f.h));
    view = { scale, x: (cw - f.w * scale) / 2, y: (ch - f.h * scale) / 2, mode: 'fit' };
    applyView();
  }

  function zoomAt(scale, point = { x: container.clientWidth / 2, y: container.clientHeight / 2 }) {
    const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
    const px = (point.x - view.x) / view.scale;
    const py = (point.y - view.y) / view.scale;
    view = { scale: s, x: point.x - px * s, y: point.y - py * s, mode: 'manual' };
    applyView();
  }

  function panBy(dx, dy) {
    view = { ...view, x: view.x + dx, y: view.y + dy, mode: 'manual' };
    applyView();
  }

  function renderNow() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    const f = format();
    shadow.size({ width: f.w, height: f.h });
    renderer.render(store.doc, store.assets);
    posterLayer.batchDraw();
    emit('rendered', store.doc);
  }

  function scheduleRender() {
    if (interacting) {
      pendingWhileInteracting = true;
      return;
    }
    if (!frame) frame = requestAnimationFrame(renderNow);
  }

  let lastFormatKey = '';
  store.subscribe((doc) => {
    ensureFontsForDoc(doc, () => {
      renderer.reset();
      scheduleRender();
    });
    const key = `${doc.orientation}|${format().w}x${format().h}`;
    if (key !== lastFormatKey) {
      lastFormatKey = key;
      fit();
    }
    scheduleRender();
  });
  lastFormatKey = `${store.doc.orientation}|${format().w}x${format().h}`;
  setImageChangeHandler(scheduleRender);

  new ResizeObserver(() => {
    stage.size({ width: container.clientWidth, height: container.clientHeight });
    if (view.mode === 'fit') fit();
    else applyView();
  }).observe(container);

  function toDesign(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    return { x: (clientX - rect.left - view.x) / view.scale, y: (clientY - rect.top - view.y) / view.scale };
  }

  function elementAt(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    const shape = stage.getIntersection({ x: clientX - rect.left, y: clientY - rect.top });
    const group = shape?.findAncestor('.element', true);
    return group ? group.id() : null;
  }

  function withExportView(fn, { doc = store.doc, quality: q = 'full' } = {}) {
    const prevSize = stage.size();
    const f = doc.formats[doc.orientation];
    quality = q;
    try {
      renderer.render(doc, store.assets);
      shadow.visible(false);
      uiLayer.visible(false);
      stage.size({ width: f.w, height: f.h });
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });
      return fn(stage, f);
    } finally {
      quality = 'preview';
      shadow.visible(true);
      uiLayer.visible(true);
      stage.size(prevSize);
      applyView();
      renderer.render(store.doc, store.assets);
      posterLayer.batchDraw();
    }
  }

  return {
    stage,
    posterLayer,
    uiLayer,
    posterGroup,
    renderer,
    get view() { return view; },
    fit,
    zoomAt,
    zoomBy: (factor, point) => zoomAt(view.scale * factor, point),
    panBy,
    renderNow,
    scheduleRender,
    setInteracting(on) {
      interacting = on;
      if (!on && pendingWhileInteracting) {
        pendingWhileInteracting = false;
        scheduleRender();
      }
    },
    elementAt,
    toDesign,
    withExportView,
    on(event, fn) {
      listeners[event].add(fn);
      return () => listeners[event].delete(fn);
    },
  };
}
