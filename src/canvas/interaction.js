import Konva from 'konva';
import { snapTargets, computeSnap } from '../core/snapping.js';
import { panCrop } from '../core/image.js';
import { MIN_BOX, SAFE_AREA } from '../core/constants.js';
import { shapeBounds } from './shapes.js';
import { toast } from '../ui/dialogs.js';
import { isTypingTarget } from '../ui/dom.js';

const ACCENT = '#4f8cff';
const GUIDE = '#ff3d9a';
const ALL_ANCHORS = ['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right'];
const LINE_ANCHORS = ['middle-left', 'middle-right', 'top-center', 'bottom-center'];

export function installInteraction(app) {
  const { editor, store, selection, settings } = app;
  const { stage, uiLayer, posterGroup, renderer } = editor;
  const container = stage.container();

  // Zwykły klik nie może być traktowany jak przeciągnięcie (inaczej powstają puste kroki cofania).
  Konva.dragDistance = 3;

  const doc = () => store.doc;
  const fmt = () => doc().formats[doc().orientation];
  const boxOf = (id) => doc().boxes[doc().orientation][id];

  // --- Warstwa UI -----------------------------------------------------------------
  const grid = new Konva.Shape({ listening: false, visible: false });
  const safe = new Konva.Rect({ listening: false, visible: false, stroke: '#f5a524', dash: [10, 8], strokeWidth: 1.5, strokeScaleEnabled: false });
  const hover = new Konva.Rect({ listening: false, visible: false, stroke: ACCENT, strokeWidth: 1, strokeScaleEnabled: false });
  const cropOutline = new Konva.Rect({ listening: false, visible: false, stroke: '#f5a524', dash: [6, 4], strokeWidth: 2, strokeScaleEnabled: false });
  const guides = new Konva.Group({ listening: false });
  const marquee = new Konva.Rect({ listening: false, visible: false, fill: 'rgba(79,140,255,0.12)', stroke: ACCENT, strokeWidth: 1, strokeScaleEnabled: false });
  const transformer = new Konva.Transformer({
    rotateEnabled: true,
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    rotationSnapTolerance: 4,
    anchorSize: 10,
    anchorCornerRadius: 3,
    anchorStroke: ACCENT,
    anchorFill: '#ffffff',
    borderStroke: ACCENT,
    keepRatio: false,
    ignoreStroke: true,
    flipEnabled: false,
    boundBoxFunc: (oldBox, newBox) => {
      const s = editor.view.scale;
      return Math.abs(newBox.width) < MIN_BOX * s || Math.abs(newBox.height) < MIN_BOX * s ? oldBox : newBox;
    },
  });
  uiLayer.add(grid, safe, hover, cropOutline, guides, marquee, transformer);

  function updateOverlays() {
    const f = fmt();
    const gs = settings.get('gridSize');
    grid.setAttrs({
      visible: settings.get('showGrid'),
      sceneFunc: (c) => {
        c.beginPath();
        for (let x = gs; x < f.w; x += gs) { c.moveTo(x, 0); c.lineTo(x, f.h); }
        for (let y = gs; y < f.h; y += gs) { c.moveTo(0, y); c.lineTo(f.w, y); }
        c.setAttr('strokeStyle', 'rgba(255,255,255,0.18)');
        c.setAttr('lineWidth', 1 / editor.view.scale);
        c.stroke();
      },
    });
    safe.setAttrs({
      visible: settings.get('showSafeArea'),
      x: f.w * SAFE_AREA,
      y: f.h * SAFE_AREA,
      width: f.w * (1 - 2 * SAFE_AREA),
      height: f.h * (1 - 2 * SAFE_AREA),
    });
    uiLayer.batchDraw();
  }

  function clearGuides() {
    guides.destroyChildren();
  }

  function drawGuides(snap) {
    const f = fmt();
    const line = (points) => guides.add(new Konva.Line({ points, stroke: GUIDE, strokeWidth: 1, dash: [4, 4], strokeScaleEnabled: false, listening: false }));
    if (snap.guideX !== null) line([snap.guideX, 0, snap.guideX, f.h]);
    if (snap.guideY !== null) line([0, snap.guideY, f.w, snap.guideY]);
  }

  // --- Zaznaczenie i uchwyty -----------------------------------------------------
  function syncDraggable() {
    for (const id of doc().order) {
      const group = renderer.groupFor(id);
      if (group) group.draggable(!doc().elements[id].locked && selection.cropId !== id);
    }
  }

  function syncTransformer() {
    const d = doc();
    cropOutline.visible(false);
    if (selection.cropId) {
      transformer.nodes([]);
      const b = boxOf(selection.cropId);
      if (b) cropOutline.setAttrs({ visible: true, x: b.x, y: b.y, width: b.w, height: b.h, rotation: b.rotation });
      uiLayer.batchDraw();
      return;
    }
    const nodes = selection.ids
      .filter((id) => d.elements[id] && !d.elements[id].locked)
      .map((id) => renderer.groupFor(id))
      .filter((n) => n && n.isVisible());
    transformer.nodes(nodes);
    const single = nodes.length === 1 ? d.elements[nodes[0].id()] : null;
    transformer.keepRatio(!!single && (single.type === 'qr' || (single.type === 'photo' && single.shape === 'circle')));
    transformer.enabledAnchors(single?.type === 'shape' && single.shape === 'line' ? LINE_ANCHORS : ALL_ANCHORS);
    transformer.forceUpdate();
    uiLayer.batchDraw();
  }

  selection.subscribe(() => {
    syncDraggable();
    syncTransformer();
  });
  editor.on('rendered', () => {
    syncDraggable();
    syncTransformer();
    updateOverlays();
  });
  editor.on('view', updateOverlays);
  settings.subscribe(updateOverlays);

  // --- Klik i ramka zaznaczenia --------------------------------------------------
  let marqueeStart = null;

  stage.on('mousedown touchstart', (e) => {
    if (e.evt.button === 1 || pan) return;
    if (e.target.getParent() === transformer) return;
    const group = e.target.findAncestor?.('.element', true);
    if (!group) {
      if (selection.cropId) {
        exitCrop();
        return;
      }
      marqueeStart = stage.getRelativePointerPosition();
      marquee.setAttrs({ x: marqueeStart.x, y: marqueeStart.y, width: 0, height: 0, visible: true });
      if (!(e.evt.shiftKey || e.evt.ctrlKey)) selection.clear();
      return;
    }
    const id = group.id();
    if (selection.cropId && selection.cropId !== id) exitCrop();
    if (selection.cropId === id) {
      cropDrag = { last: stage.getRelativePointerPosition() };
      return;
    }
    if (e.evt.shiftKey || e.evt.ctrlKey) selection.toggle(id);
    else if (!selection.has(id)) selection.set([id]);
  });

  stage.on('mousemove touchmove', () => {
    if (cropDrag) {
      const p = stage.getRelativePointerPosition();
      const dx = p.x - cropDrag.last.x;
      const dy = p.y - cropDrag.last.y;
      cropDrag.last = p;
      applyCropPan(dx, dy);
      return;
    }
    if (!marqueeStart) return;
    const p = stage.getRelativePointerPosition();
    marquee.setAttrs({
      x: Math.min(p.x, marqueeStart.x),
      y: Math.min(p.y, marqueeStart.y),
      width: Math.abs(p.x - marqueeStart.x),
      height: Math.abs(p.y - marqueeStart.y),
    });
    uiLayer.batchDraw();
  });

  function endPointer() {
    cropDrag = null;
    if (!marqueeStart) return;
    marqueeStart = null;
    const r = { x: marquee.x(), y: marquee.y(), w: marquee.width(), h: marquee.height() };
    marquee.visible(false);
    if (r.w > 3 || r.h > 3) {
      const d = doc();
      const boxes = d.boxes[d.orientation];
      const hits = d.order.filter((id) => {
        const b = boxes[id];
        return b && !b.hidden && !d.elements[id].locked && b.x < r.x + r.w && r.x < b.x + b.w && b.y < r.y + r.h && r.y < b.y + b.h;
      });
      selection.set([...selection.ids, ...hits]);
    }
    uiLayer.batchDraw();
  }
  window.addEventListener('mouseup', endPointer);
  window.addEventListener('touchend', endPointer);

  // --- Najechanie ----------------------------------------------------------------
  posterGroup.on('mouseover', (e) => {
    const group = e.target.findAncestor('.element', true);
    if (!group) return;
    const el = doc().elements[group.id()];
    container.style.cursor = el?.locked ? 'not-allowed' : selection.cropId === group.id() ? 'grab' : 'move';
    if (selection.has(group.id())) return;
    const b = boxOf(group.id());
    if (b) hover.setAttrs({ visible: true, x: b.x, y: b.y, width: b.w, height: b.h, rotation: b.rotation });
    uiLayer.batchDraw();
  });
  posterGroup.on('mouseout', () => {
    container.style.cursor = '';
    hover.visible(false);
    uiLayer.batchDraw();
  });

  // --- Przeciąganie z przyciąganiem ----------------------------------------------
  let drag = null;

  posterGroup.on('dragstart', (e) => {
    const group = e.target;
    if (group.name() !== 'element') return;
    const id = group.id();
    if (!selection.has(id)) selection.set([id]);
    editor.setInteracting(true);
    hover.visible(false);
    const d = doc();
    const boxes = d.boxes[d.orientation];
    const others = d.order.filter((x) => !selection.has(x) && boxes[x] && !boxes[x].hidden).map((x) => boxes[x]);
    drag = {
      id,
      start: new Map(selection.ids.filter((sid) => boxes[sid]).map((sid) => [sid, { x: boxes[sid].x, y: boxes[sid].y }])),
      targets: snapTargets(others, fmt(), { safeArea: settings.get('showSafeArea') ? SAFE_AREA : 0 }),
    };
  });

  posterGroup.on('dragmove', (e) => {
    if (!drag || e.target.id() !== drag.id) return;
    const group = e.target;
    const box = boxOf(drag.id);
    let x = group.x();
    let y = group.y();
    clearGuides();
    if (settings.get('snap') && !e.evt?.altKey && box && box.rotation === 0) {
      const s = computeSnap({ x, y, w: box.w, h: box.h }, drag.targets, 8 / editor.view.scale);
      x += s.dx;
      y += s.dy;
      group.position({ x, y });
      drawGuides(s);
    }
    const origin = drag.start.get(drag.id);
    const dx = x - origin.x;
    const dy = y - origin.y;
    for (const [sid, p] of drag.start) {
      if (sid === drag.id || doc().elements[sid]?.locked) continue;
      renderer.groupFor(sid)?.position({ x: p.x + dx, y: p.y + dy });
    }
    uiLayer.batchDraw();
  });

  posterGroup.on('dragend', (e) => {
    if (!drag || e.target.id() !== drag.id) return;
    const moved = [...drag.start.keys()].map((sid) => ({ sid, group: renderer.groupFor(sid) })).filter((m) => m.group);
    drag = null;
    clearGuides();
    editor.setInteracting(false);
    store.update((d) => {
      let changed = false;
      for (const { sid, group } of moved) {
        const b = d.boxes[d.orientation][sid];
        if (!b || d.elements[sid]?.locked) continue;
        const x = Math.round(group.x());
        const y = Math.round(group.y());
        if (x !== b.x || y !== b.y) changed = true;
        b.x = x;
        b.y = y;
      }
      return changed ? undefined : false;
    });
  });

  // --- Zmiana rozmiaru i obrót ---------------------------------------------------
  transformer.on('transformstart', () => editor.setInteracting(true));

  transformer.on('transform', () => {
    const d = doc();
    for (const node of transformer.nodes()) {
      const id = node.id();
      const b = boxOf(id);
      if (!b) continue;
      const w = Math.max(MIN_BOX, node.getAttr('boxW') * node.scaleX());
      const h = Math.max(MIN_BOX, node.getAttr('boxH') * node.scaleY());
      node.scale({ x: 1, y: 1 });
      renderer.liveUpdate(id, d, store.assets, { ...b, x: node.x(), y: node.y(), w, h, rotation: node.rotation() });
    }
  });

  transformer.on('transformend', () => {
    const nodes = transformer.nodes();
    editor.setInteracting(false);
    store.update((d) => {
      let changed = false;
      for (const node of nodes) {
        const b = d.boxes[d.orientation][node.id()];
        if (!b) continue;
        const x = Math.round(node.x());
        const y = Math.round(node.y());
        const w = Math.max(MIN_BOX, Math.round(node.getAttr('boxW')));
        const h = Math.max(MIN_BOX, Math.round(node.getAttr('boxH')));
        const rotation = Math.round(node.rotation() * 10) / 10;
        if (x !== b.x || y !== b.y || w !== b.w || h !== b.h || rotation !== b.rotation) changed = true;
        b.x = x;
        b.y = y;
        b.w = w;
        b.h = h;
        b.rotation = rotation;
      }
      return changed ? undefined : false;
    });
  });

  // --- Zoom i przesuwanie widoku -------------------------------------------------
  let pan = null;
  let spaceDown = false;

  stage.on('wheel', (e) => {
    e.evt.preventDefault();
    if (selection.cropId && cropWheel(e.evt)) return;
    if (e.evt.ctrlKey) {
      editor.zoomBy(e.evt.deltaY < 0 ? 1.1 : 1 / 1.1, stage.getPointerPosition());
    } else if (e.evt.shiftKey) {
      editor.panBy(-e.evt.deltaY, 0);
    } else {
      editor.panBy(-e.evt.deltaX, -e.evt.deltaY);
    }
  });

  container.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      e.preventDefault();
      e.stopPropagation();
      pan = { x: e.clientX, y: e.clientY };
      container.style.cursor = 'grabbing';
    }
  }, true);
  window.addEventListener('mousemove', (e) => {
    if (!pan) return;
    editor.panBy(e.clientX - pan.x, e.clientY - pan.y);
    pan = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mouseup', () => {
    if (!pan) return;
    pan = null;
    container.style.cursor = spaceDown ? 'grab' : '';
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isTypingTarget(e.target) && !e.repeat) {
      spaceDown = true;
      container.style.cursor = 'grab';
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spaceDown = false;
      if (!pan) container.style.cursor = '';
    }
  });

  // --- Kadrowanie zdjęcia --------------------------------------------------------
  let cropDrag = null;

  function enterCrop(id) {
    const el = doc().elements[id];
    if (el?.type !== 'photo' || !el.assetId) return;
    selection.setCrop(id);
    store.breakCoalescing();
    syncDraggable();
    toast('Kadrowanie: przeciągnij zdjęcie, kółko myszy = przybliżenie, Enter lub Esc = gotowe.');
  }

  function exitCrop() {
    if (!selection.cropId) return;
    selection.setCrop(null);
    store.breakCoalescing();
    syncDraggable();
    syncTransformer();
  }

  function applyCropPan(dx, dy) {
    const id = selection.cropId;
    const el = doc().elements[id];
    const asset = store.getAsset(el?.assetId);
    const box = boxOf(id);
    if (!asset || !box) return;
    const b = shapeBounds(el.shape, box.w, box.h);
    const crop = panCrop(el.crop, el.flipX ? -dx : dx, dy, asset.w, asset.h, b.w, b.h);
    store.update((d) => {
      d.elements[id].crop = crop;
    }, { key: `crop:${id}` });
  }

  function cropWheel(evt) {
    const id = selection.cropId;
    const el = doc().elements[id];
    if (!el) return false;
    const zoom = Math.min(5, Math.max(1, el.crop.zoom * (evt.deltaY < 0 ? 1.08 : 1 / 1.08)));
    store.update((d) => {
      d.elements[id].crop.zoom = Math.round(zoom * 100) / 100;
    }, { key: `crop:${id}` });
    return true;
  }

  window.addEventListener('keydown', (e) => {
    if (selection.cropId && (e.key === 'Enter' || e.key === 'Escape') && !isTypingTarget(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      exitCrop();
    }
  }, true);

  posterGroup.on('dblclick dbltap', (e) => {
    const group = e.target.findAncestor('.element', true);
    if (!group) return;
    const el = doc().elements[group.id()];
    if (!el) return;
    if (el.type === 'photo') {
      if (el.assetId) enterCrop(el.id);
      else app.actions.pickPhoto?.(el.id);
    } else if (el.type === 'image' && !el.assetId) {
      app.actions.pickPhoto?.(el.id);
    } else {
      app.actions.focusElementField?.(el.id);
    }
  });

  // --- Akcje ---------------------------------------------------------------------
  Object.assign(app.actions, {
    zoomIn: () => editor.zoomBy(1.2),
    zoomOut: () => editor.zoomBy(1 / 1.2),
    zoomFit: () => editor.fit(),
    zoom100: () => editor.zoomAt(1),
    toggleGrid: () => settings.set({ showGrid: !settings.get('showGrid') }),
    toggleSafeArea: () => settings.set({ showSafeArea: !settings.get('showSafeArea') }),
    toggleSnap: () => {
      settings.set({ snap: !settings.get('snap') });
      toast(settings.get('snap') ? 'Przyciąganie włączone.' : 'Przyciąganie wyłączone (Alt podczas przeciągania też je wyłącza).');
    },
    enterCrop,
    exitCrop,
  });

  updateOverlays();
}
