import { ORIENTATIONS } from './constants.js';

export const LAYOUT_ROLES = ['photo', 'panel', 'accent', 'title', 'subtitle', 'points', 'qr', 'footer'];

const B = (x, y, w, h) => ({ bleed: true, rect: [x, y, w, h] });
const BLEED_PHOTO = { shape: 'rect', shadow: false, borderWidth: 0 };
const DEFAULT_PROPS = { title: { align: 'left' }, subtitle: { align: 'left' }, footer: { align: 'left' } };
// Role ułożone na samym spodzie (w tej kolejności). Karta ma panel pod zdjęciem, pozostałe układy — zdjęcie pod panelem.
const DEFAULT_BOTTOM = ['photo', 'panel'];

export const LAYOUTS = {
  'split-left': {
    name: 'Zdjęcie z lewej / u góry',
    landscape: {
      photo: [0, 0, 0.4, 1], accent: [0.45, 0.03, 0.07, 0.012], title: [0.45, 0.06, 0.55, 0.2],
      subtitle: [0.45, 0.27, 0.55, 0.09], points: [0.45, 0.41, 0.35, 0.5], qr: [0.82, 0.56, 0.18, 0.36],
      footer: [0.45, 0.94, 0.55, 0.06],
    },
    portrait: {
      photo: [0, 0, 1, 0.4], accent: [0, 0.43, 0.14, 0.006], title: [0, 0.45, 1, 0.11],
      subtitle: [0, 0.565, 1, 0.05], points: [0, 0.63, 0.64, 0.3], qr: [0.68, 0.7, 0.32, 0.2],
      footer: [0, 0.955, 1, 0.045],
    },
  },
  'split-right': {
    name: 'Zdjęcie z prawej / u dołu',
    landscape: {
      photo: [0.6, 0, 0.4, 1], accent: [0, 0.03, 0.07, 0.012], title: [0, 0.06, 0.55, 0.2],
      subtitle: [0, 0.27, 0.55, 0.09], points: [0, 0.41, 0.35, 0.5], qr: [0.37, 0.56, 0.18, 0.36],
      footer: [0, 0.94, 0.55, 0.06],
    },
    portrait: {
      accent: [0, 0, 0.14, 0.006], title: [0, 0.02, 1, 0.11], subtitle: [0, 0.135, 1, 0.05],
      points: [0, 0.2, 0.64, 0.3], qr: [0.68, 0.25, 0.32, 0.2], photo: [0, 0.54, 1, 0.41],
      footer: [0, 0.96, 1, 0.04],
    },
  },
  'full-photo': {
    name: 'Zdjęcie w tle z panelem',
    props: { photo: BLEED_PHOTO },
    landscape: {
      photo: B(0, 0, 1, 1), panel: [0.52, 0, 0.48, 1], accent: [0.56, 0.03, 0.07, 0.012],
      title: [0.56, 0.06, 0.4, 0.2], subtitle: [0.56, 0.27, 0.4, 0.09], points: [0.56, 0.4, 0.4, 0.32],
      qr: [0.56, 0.74, 0.14, 0.26], footer: [0.72, 0.88, 0.24, 0.08],
    },
    portrait: {
      photo: B(0, 0, 1, 1), panel: [0, 0.5, 1, 0.5], accent: [0.05, 0.53, 0.14, 0.006],
      title: [0.05, 0.545, 0.9, 0.1], subtitle: [0.05, 0.65, 0.9, 0.045], points: [0.05, 0.71, 0.58, 0.25],
      qr: [0.66, 0.73, 0.29, 0.18], footer: [0.05, 0.965, 0.9, 0.03],
    },
  },
  card: {
    name: 'Karta centralna',
    bottom: ['panel', 'photo'],
    props: {
      photo: { shape: 'circle' },
      title: { align: 'center' },
      subtitle: { align: 'center' },
      footer: { align: 'center' },
    },
    landscape: {
      panel: [0.06, 0, 0.88, 1], photo: [0.4, 0.05, 0.2, 0.36], title: [0.12, 0.44, 0.76, 0.13],
      subtitle: [0.12, 0.58, 0.76, 0.07], points: [0.16, 0.68, 0.5, 0.27], qr: [0.72, 0.67, 0.13, 0.28],
    },
    portrait: {
      panel: [0, 0, 1, 1], photo: [0.25, 0.04, 0.5, 0.28], title: [0.06, 0.35, 0.88, 0.09],
      subtitle: [0.06, 0.445, 0.88, 0.045], accent: [0.43, 0.505, 0.14, 0.005], points: [0.1, 0.53, 0.8, 0.24],
      qr: [0.35, 0.79, 0.3, 0.15], footer: [0.06, 0.955, 0.88, 0.035],
    },
  },
  sidebar: {
    name: 'Pół na pół (zdjęcie na spad)',
    props: { photo: BLEED_PHOTO },
    landscape: {
      photo: B(0.5, 0, 0.5, 1), accent: [0, 0.03, 0.07, 0.012], title: [0, 0.06, 0.46, 0.2],
      subtitle: [0, 0.27, 0.46, 0.09], points: [0, 0.4, 0.3, 0.5], qr: [0.32, 0.58, 0.15, 0.3],
      footer: [0, 0.94, 0.46, 0.06],
    },
    portrait: {
      photo: B(0, 0, 1, 0.45), accent: [0, 0.47, 0.14, 0.006], title: [0, 0.49, 1, 0.1],
      subtitle: [0, 0.595, 1, 0.045], points: [0, 0.66, 0.64, 0.28], qr: [0.68, 0.72, 0.32, 0.19],
      footer: [0, 0.96, 1, 0.04],
    },
  },
  'photo-top': {
    name: 'Baner ze zdjęciem',
    props: { photo: BLEED_PHOTO },
    landscape: {
      photo: B(0, 0, 1, 0.48), accent: [0, 0.5, 0.06, 0.012], title: [0, 0.53, 0.42, 0.16],
      subtitle: [0, 0.7, 0.42, 0.08], points: [0.45, 0.53, 0.38, 0.45], qr: [0.85, 0.62, 0.15, 0.36],
      footer: [0, 0.92, 0.42, 0.08],
    },
    portrait: {
      photo: B(0, 0, 1, 0.38), accent: [0, 0.385, 0.14, 0.006], title: [0, 0.4, 1, 0.1],
      subtitle: [0, 0.505, 1, 0.045], points: [0, 0.57, 1, 0.22], qr: [0.34, 0.8, 0.32, 0.15],
      footer: [0, 0.96, 1, 0.04],
    },
  },
};

const box = (x, y, w, h, hidden = false) => ({
  x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, hidden,
});

const hiddenBox = (f) => box(f.w * 0.35, f.h * 0.4, f.w * 0.3, f.h * 0.2, true);
const freeBox = (f) => box(f.w * 0.3, f.h * 0.4, f.w * 0.4, f.h * 0.2);

export function layoutMargin(format) {
  return Math.round(Math.min(format.w, format.h) * 0.06);
}

function resolveId(layoutId) {
  return LAYOUTS[layoutId] ? layoutId : 'split-left';
}

export function computeLayout(layoutId, format, orientation) {
  const spec = LAYOUTS[resolveId(layoutId)][orientation === 'portrait' ? 'portrait' : 'landscape'];
  const m = layoutMargin(format);
  const cw = format.w - 2 * m;
  const ch = format.h - 2 * m;
  const out = {};
  for (const role of LAYOUT_ROLES) {
    const r = spec[role];
    if (!r) {
      out[role] = hiddenBox(format);
    } else if (r.bleed) {
      const [x, y, w, h] = r.rect;
      out[role] = box(x * format.w, y * format.h, w * format.w, h * format.h);
    } else {
      const [x, y, w, h] = r;
      out[role] = box(m + x * cw, m + y * ch, w * cw, h * ch);
    }
  }
  return out;
}

export function layoutPhotoHint(layoutId) {
  const hint = LAYOUTS[resolveId(layoutId)].props?.photo;
  return hint ? structuredClone(hint) : null;
}

export function applyBottomOrder(doc, layoutId = doc.layoutId) {
  const bottomIds = (LAYOUTS[resolveId(layoutId)].bottom ?? DEFAULT_BOTTOM)
    .map((role) => doc.order.find((eid) => doc.elements[eid]?.role === role))
    .filter(Boolean);
  doc.order = [...bottomIds, ...doc.order.filter((eid) => !bottomIds.includes(eid))];
  return doc;
}

export function applyLayout(doc, layoutId, orientations = ORIENTATIONS) {
  const id = resolveId(layoutId);
  for (const o of orientations) {
    const format = doc.formats[o];
    const boxes = computeLayout(id, format, o);
    for (const el of Object.values(doc.elements)) {
      if (el.role === 'free') {
        if (!doc.boxes[o][el.id]) doc.boxes[o][el.id] = freeBox(format);
      } else if (boxes[el.role]) {
        doc.boxes[o][el.id] = { ...boxes[el.role] };
      }
    }
  }
  applyBottomOrder(doc, id);
  const props = { ...DEFAULT_PROPS, ...LAYOUTS[id].props };
  for (const el of Object.values(doc.elements)) {
    if (props[el.role]) Object.assign(el, structuredClone(props[el.role]));
  }
  doc.layoutId = id;
  return doc;
}
