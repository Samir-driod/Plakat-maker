export const SCHEMA_VERSION = 1;
export const APP_ID = 'plakat-maker';
export const FILE_EXT = 'plakat';

export const ORIENTATIONS = ['landscape', 'portrait'];

export const FORMAT_PRESETS = [
  { id: '16:9', label: '16:9 — Full HD (TV, monitor)', landscape: { w: 1920, h: 1080 }, portrait: { w: 1080, h: 1920 } },
  { id: '4:3', label: '4:3 — klasyczny ekran', landscape: { w: 1600, h: 1200 }, portrait: { w: 1200, h: 1600 } },
  { id: '1:1', label: '1:1 — kwadrat', landscape: { w: 1500, h: 1500 }, portrait: { w: 1500, h: 1500 } },
  { id: '21:9', label: '21:9 — ultrapanorama', landscape: { w: 2520, h: 1080 }, portrait: { w: 1080, h: 2520 } },
];

export const PALETTE_KEYS = ['bg', 'bg2', 'accent', 'text', 'muted'];
export const PALETTE_LABELS = { bg: 'Tło', bg2: 'Tło 2', accent: 'Akcent', text: 'Tekst', muted: 'Tekst pomocniczy' };

export const MAX_POINTS = 6;
export const MIN_BOX = 4;
export const MIN_FORMAT = 200;
export const MAX_FORMAT = 8000;
export const IMAGE_MAX_SIDE = 3000;
export const SAFE_AREA = 0.05;
export const HISTORY_LIMIT = 100;
export const COALESCE_MS = 800;
export const AUTOSAVE_DELAY_MS = 3000;

export const BULLETS = {
  dot: { label: 'Kropka', char: '●' },
  check: { label: 'Ptaszek', char: '✓' },
  number: { label: 'Numer', char: null },
  arrow: { label: 'Strzałka', char: '➜' },
  dash: { label: 'Myślnik', char: '—' },
  star: { label: 'Gwiazdka', char: '★' },
  custom: { label: 'Własny znak', char: null },
};

export const ELEMENT_TYPES = ['photo', 'text', 'points', 'qr', 'image', 'shape'];
export const ROLES = ['photo', 'title', 'subtitle', 'points', 'qr', 'accent', 'panel', 'footer', 'free'];
export const PHOTO_SHAPES = { rect: 'Prostokąt', rounded: 'Zaokrąglony', circle: 'Koło', arch: 'Łuk', hexagon: 'Sześciokąt' };
export const SHAPE_KINDS = { rect: 'Prostokąt', ellipse: 'Elipsa', line: 'Linia' };
export const BACKGROUND_TYPES = { solid: 'Jednolite', linear: 'Gradient liniowy', radial: 'Gradient radialny', image: 'Zdjęcie', pattern: 'Wzór' };
export const PATTERNS = { dots: 'Kropki', grid: 'Kratka', diagonal: 'Ukośne linie', waves: 'Fale' };
export const QR_MODULE_STYLES = { square: 'Kwadraty', rounded: 'Zaokrąglone', dots: 'Kropki' };
export const QR_ECL = { L: 'Niski (7%)', M: 'Średni (15%)', Q: 'Wysoki (25%)', H: 'Najwyższy (30%)' };
export const TEXT_ALIGN = { left: 'Do lewej', center: 'Do środka', right: 'Do prawej' };
export const TEXT_VALIGN = { top: 'Góra', middle: 'Środek', bottom: 'Dół' };
