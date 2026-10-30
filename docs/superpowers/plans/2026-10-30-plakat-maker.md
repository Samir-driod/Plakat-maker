# Plakat Maker — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Program na Windows (.exe) do tworzenia plakatów ekranowych w poziomie i pionie — zdjęcie, tytuł, punkty, kod QR — z przeciąganiem myszką, motywami, bogatą kastomizacją, eksportem PNG/JPG/PDF i trybem pełnoekranowym.

**Architecture:** Electron z bezpiecznym rendererem (sandbox + preload). Jedno źródło prawdy — `store` z dokumentem JSON (historia cofania, autozapis) — renderowane na płótnie Konva i synchronizowane z panelami DOM przez „bindingi”. Cała logika domenowa (`src/core`, `electron/lib`) jest czysta i pokryta testami Vitest; płótno i UI weryfikowane ręcznie oraz testem E2E Playwright.

**Tech Stack:** Electron 45.2.0, Konva 10.9.0, qrcode 1.5.4, jsPDF 4.2.1, esbuild 0.28.2, Vitest 5.0.5, @playwright/test 1.64.1, electron-builder 26.18.0, @fontsource/* 5.3.0, Node 24.

**Spec:** `docs/superpowers/specs/2026-10-30-plakat-maker-design.md`

## Global Constraints

- Node.js ≥ 24 (na maszynie: 24.11.0), Windows 10/11 x64.
- Wersje zależności przypięte dokładnie (`--save-exact`): electron 45.2.0, electron-builder 26.18.0, esbuild 0.28.2, vitest 5.0.5, @playwright/test 1.64.1, konva 10.9.0, qrcode 1.5.4, jspdf 4.2.1, wszystkie @fontsource/* 5.3.0. Wszystkie jako `devDependencies` (renderer jest bundlowany, proces główny używa tylko `electron` i modułów Node).
- ESM wszędzie (`"type": "module"`), wyjątek: `electron/preload.cjs` (CommonJS — wymóg sandboxa).
- Cały tekst widoczny dla użytkownika po polsku; identyfikatory w kodzie po angielsku.
- `src/core/**` i `electron/lib/**` nie mogą importować DOM, Konvy ani Electrona (muszą działać pod Vitestem w Node).
- Kolor w dokumencie to `#rrggbb` (małe litery) albo odwołanie `palette:<bg|bg2|accent|text|muted>`.
- Geometria elementów w pikselach projektu bieżącej orientacji (`doc.formats[orientation]`), osobno dla `landscape` i `portrait`.
- Każda zmiana dokumentu przechodzi przez `store.update(recipe, opts)` — nigdy bezpośrednia mutacja `store.doc`.
- Brak sieci w czasie działania; CSP w `index.html`; `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
- Rozszerzenie projektu: `.plakat`; wersja schematu: `1`.
- Testy: `npm test` (Vitest) musi przechodzić na końcu każdego zadania.

---

## Struktura plików

```
package.json                 skrypty, zależności, konfiguracja electron-builder
build.mjs                    bundlowanie renderera, CSS i czcionek (esbuild)
vitest.config.js
playwright.config.js
.gitignore
electron/
  main.js                    cykl życia aplikacji, okno, pojedyncza instancja, ochrona zamknięcia, awarie
  preload.cjs                window.api (contextBridge) — jedyny most renderer ↔ main
  ipc.js                     rejestracja wszystkich kanałów IPC
  present.js                 okno prezentacji pełnoekranowej
  lib/atomicWrite.js         zapis atomowy z kopią .bak i ponawianiem
  lib/recent.js              lista ostatnich plików
  lib/settingsStore.js       ustawienia w pliku JSON (wartości domyślne z src/core/settings.js)
  lib/templates.js           własne szablony użytkownika (pliki w userData)
  lib/logger.js              log błędów z rotacją (userData/logs/error.log)
src/
  index.html                 okno edytora
  present.html               okno prezentacji
  styles/app.css             cały wygląd interfejsu
  styles/fonts.css           importy czcionek @fontsource
  core/                      CZYSTA LOGIKA (testowana)
    constants.js             stałe: formaty, limity, znaczniki punktów, opóźnienia
    ids.js                   generowanie identyfikatorów
    colors.js                kolory: hex/rgb, kontrast WCAG, mieszanie, paleta ze zdjęcia
    model.js                 domyślne elementy, dokument bazowy, resolveColor/resolveFont
    schema.js                serializacja, walidacja, normalizacja, migracje
    history.js               cofanie/ponawianie ze scalaniem zmian
    store.js                 magazyn stanu + zasoby + flaga „niezapisane”
    settings.js              domyślne ustawienia i ich walidacja (wspólne z procesem głównym)
    keys.js                  zamiana zdarzeń klawiatury na nazwy skrótów
    selection.js             zaznaczenie i tryb kadrowania
    layouts.js               6 układów dla poziomu i pionu
    themes.js                10 motywów + applyTheme
    fonts.js                 lista czcionek, fontStyle, specyfikacje CSS
    document.js              newDocument, setFormat, findByRole, restoreRole, STARTERS
    elementOps.js            dodawanie, duplikowanie, usuwanie, warstwy, przesuwanie, ukrywanie, blokowanie
    align.js                 wyrównywanie i rozkładanie elementów
    snapping.js              przyciąganie i linie pomocnicze
    textfit.js               dopasowanie rozmiaru tekstu i układ punktów
    qr.js                    treść QR (link, Wi-Fi, vCard…), walidacja, macierz modułów
    image.js                 skalowanie, kadrowanie cover/contain, filtry CSS
    exportSizes.js           wymiary eksportu, strona PDF, nazwy plików, dopasowanie do ekranu
  canvas/                    KONVA
    imageCache.js            ładowanie obrazów z zasobów + cache przefiltrowanych wersji
    fontLoader.js            wczytywanie czcionek przed rysowaniem
    shapes.js                ścieżki kształtów zdjęcia (prostokąt, koło, łuk, sześciokąt…)
    nodes/background.js      tło: kolor, gradienty, zdjęcie, wzory
    nodes/text.js            tekst z auto-dopasowaniem
    nodes/points.js          lista punktów ze znacznikami
    nodes/photo.js           zdjęcie w kształcie, ramka, cień, filtry, kadr
    nodes/qr.js              kod QR wektorowo, style modułów, logo, podpis, karta
    nodes/shape.js           prostokąt, elipsa, linia
    nodes/image.js           dodatkowy obraz (logo)
    nodes/index.js           rejestr typów węzłów
    render.js                synchronizacja dokument → węzły Konvy
    editor.js                scena, widok/zoom, renderowanie, widok eksportowy 1:1
    interaction.js           zaznaczanie, uchwyty, przeciąganie z przyciąganiem, siatka, kadrowanie, zoom/przesuwanie
    exporter.js              PNG/JPG/PDF z płótna
  ui/
    dom.js                   h() — tworzenie elementów DOM
    controls.js              pola: tekst, suwak, kolor, lista, przełącznik, segmenty, liczba
    fontOptions.js           lista czcionek do wyboru
    binder.js                wiązanie kontrolek ze store
    dialogs.js               okna modalne, potwierdzenia, powiadomienia (toast)
    toolbar.js               górny pasek narzędzi
    statusbar.js             dolny pasek stanu
    sidebar.js               zakładki panelu bocznego
    panels/common.js         edytory wspólne: punkty, dane QR, widoczność, przywracanie
    panels/content.js        Treść: zdjęcie, tytuł, podtytuł, punkty, QR, stopka
    panels/style.js          Wygląd: motywy, kolory, czcionki, tło
    panels/layout.js         Układ: orientacja, format, układy, pomoce
    panels/element.js        Element: właściwości zaznaczonego elementu, wyrównanie
    panels/layers.js         Warstwy
    exportDialog.js          okno eksportu
    newProjectDialog.js      okno „Nowy projekt” (startery + własne szablony)
    shortcuts.js             skróty klawiszowe + okno pomocy F1
  renderer/
    main.js                  start aplikacji, łączenie modułów
    settings.js              ustawienia po stronie okna (zapis przez IPC)
    commands.js              polecenia edycji (cofnij, duplikuj, warstwy, wyrównanie…)
    project.js               nowy/otwórz/zapisz/zapisz jako, tytuł okna, zamykanie, ostatnie pliki
    autosave.js              autozapis i odzyskiwanie pracy
    presentation.js          pokaz pełnoekranowy (wybór ekranu)
    images.js                import obrazów (plik, schowek, przeciąganie), zmniejszanie
    errors.js                globalna obsługa błędów
    present.js               skrypt okna prezentacji
scripts/make-icon.cjs        generowanie ikony aplikacji (build/icon.png)
tests/core/*.test.js         testy jednostkowe src/core
tests/electron/*.test.js     testy jednostkowe electron/lib
e2e/smoke.spec.js            test E2E Playwright
README.md                    instrukcja użytkownika (PL)
```

## Wspólne kontrakty (ściąga dla wszystkich zadań)

**Dokument** (`doc`):
```js
{
  version: 1,
  meta: { name: 'Plakat' },
  orientation: 'landscape' | 'portrait',
  formatId: '16:9' | '4:3' | '1:1' | '21:9' | 'custom',
  formats: { landscape: { w, h }, portrait: { w, h } },
  themeId: 'nocny',
  layoutId: 'split-left',
  palette: { bg, bg2, accent, text, muted },          // '#rrggbb'
  fonts: { heading: 'Montserrat', body: 'Inter' },
  background: { type, angle, imageId, blur, dim, pattern, patternColor, patternOpacity, patternSize },
  elements: { [id]: { id, type, role, name, locked, ...propsTypu } },
  boxes: { landscape: { [id]: Box }, portrait: { [id]: Box } },
  order: [id, ...]                                      // od spodu do góry
}
Box = { x, y, w, h, rotation, hidden }
assets = { [assetId]: { dataUrl, w, h, name } }        // poza historią cofania
```

**Najważniejsze funkcje** (pełne sygnatury w zadaniach):
- `colors.js`: `normalizeHex, hexToRgb, rgbToHex, rgbToHsl, relativeLuminance, contrastRatio, readableOn, mix, withAlpha, extractPalette, paletteFromImage`
- `model.js`: `ELEMENT_DEFAULTS, DEFAULT_PALETTE, DEFAULT_FONTS, DEFAULT_BACKGROUND, ROLE_NAMES, createElement, createBaseDocument, resolveColor, resolveFont, currentFormat, getBox`
- `schema.js`: `ProjectError, mergeWithDefaults, normalizeDocument, collectAssetIds, projectToObject, projectFromObject, serializeProject, parseProject`
- `history.js`: `createHistory({ limit, coalesceMs, now })`
- `store.js`: `createStore(doc, { history })` → `{ doc, assets, dirty, subscribe, update, addAsset, getAsset, replace, undo, redo, canUndo, canRedo, markSaved, breakCoalescing }`
- `selection.js`: `createSelection()` → `{ ids, cropId, set, toggle, clear, setCrop, prune, subscribe }`
- `layouts.js`: `LAYOUTS, LAYOUT_ROLES, layoutMargin, computeLayout, layoutPhotoHint, applyBottomOrder, applyLayout`
- `themes.js`: `THEMES, getTheme, applyTheme`
- `fonts.js`: `BUNDLED_FONTS, SYSTEM_FONTS, FONT_SAMPLE, fontStyleString, cssFontSpec, allFontFamilies`
- `document.js`: `STARTERS, newDocument, chooseLayout, setFormat, findByRole, restoreRole`
- `settings.js`: `DEFAULT_SETTINGS, mergeSettings, addRecentColor`
- `keys.js`: `keyName, comboFromEvent`
- `elementOps.js`: `addElement, duplicateElements, deleteElements, reorder, nudge, setBox, toggleHidden, setLocked, renameElement`
- `align.js`: `alignBoxes, distributeBoxes`
- `snapping.js`: `snapTargets, computeSnap`
- `textfit.js`: `fitFontSize, layoutPoints, fitPoints`
- `qr.js`: `QR_KINDS, buildQrPayload, qrValidationError, qrMatrix`
- `image.js`: `downscaleSize, coverRect, containRect, panCrop, buildCssFilter, isImageFile, isProjectFile`
- `exportSizes.js`: `EXPORT_SCALES, exportDims, pdfPage, exportFileName, presentationScale`
- `window.api` (preload): pełna lista w Zadaniu 22.
- Moduły renderera eksportują `install(app)` i są wpięte w tablicę `FEATURES` w `src/renderer/main.js` (UI zawsze ostatnie); `app = { api, settings, store, selection, editor, actions, ui, startupTasks, project }`. Pasek narzędzi, menu, skróty i panele wywołują wyłącznie akcje `app.actions.*`.
- Węzeł płótna: `{ create(group), update(group, el, box, ctx) }` (Zadanie 12). Panel boczny: `{ id, label, key(doc, selection), render(root, { app, binder }) }` (Zadanie 17).
- Kod planu został złożony i uruchomiony przed przekazaniem: 276 testów jednostkowych i test E2E przechodzą, a eksport PNG został sprawdzony wizualnie.

---
### Task 1: Szkielet projektu (Electron + esbuild + Vitest + powłoka UI)

**Files:**
- Create: `package.json`, `.gitignore`, `build.mjs`, `vitest.config.js`
- Create: `electron/main.js` (wersja startowa — pełna w Zadaniu 20), `electron/preload.cjs` (wersja startowa)
- Create: `src/index.html`, `src/styles/app.css`, `src/styles/fonts.css`, `src/renderer/main.js` (wersja startowa)

**Interfaces:**
- Consumes: nic.
- Produces: `npm run build` → `dist/renderer.js`, `dist/app.css`, `dist/fonts.css`, `dist/fonts/*`, `dist/present.js` (od Zadania 24). `npm start` otwiera okno. Kontenery DOM: `#toolbar`, `#tabs`, `#panel`, `#workspace`, `#stage`, `#drop-overlay`, `#statusbar`, `#modal-root`, `#toast-root`. Klasy CSS opisane w `app.css` (używane przez wszystkie zadania UI).

- [ ] **Step 1: Zainicjuj repozytorium i npm**

```bash
git init
npm init -y
```

- [ ] **Step 2: Zainstaluj zależności (dokładne wersje)**

```bash
npm i -D --save-exact electron@45.2.0 electron-builder@26.18.0 esbuild@0.28.2 vitest@5.0.5 @playwright/test@1.64.1 konva@10.9.0 qrcode@1.5.4 jspdf@4.2.1
npm i -D --save-exact @fontsource/inter@5.3.0 @fontsource/montserrat@5.3.0 @fontsource/poppins@5.3.0 @fontsource/roboto@5.3.0 @fontsource/open-sans@5.3.0 @fontsource/lato@5.3.0 @fontsource/nunito@5.3.0 @fontsource/raleway@5.3.0 @fontsource/oswald@5.3.0 @fontsource/bebas-neue@5.3.0 @fontsource/playfair-display@5.3.0 @fontsource/merriweather@5.3.0 @fontsource/lora@5.3.0 @fontsource/caveat@5.3.0
```

- [ ] **Step 3: Nadpisz `package.json` (zachowaj sekcję `devDependencies` wygenerowaną przez npm)**

```json
{
  "name": "plakat-maker",
  "productName": "Plakat Maker",
  "version": "1.0.0",
  "description": "Tworzenie plakatów na ekran w poziomie i pionie",
  "author": "Plakat Maker",
  "license": "UNLICENSED",
  "private": true,
  "type": "module",
  "main": "electron/main.js",
  "scripts": {
    "build": "node build.mjs",
    "dev": "node build.mjs --watch",
    "start": "node build.mjs && electron .",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "node build.mjs && playwright test",
    "icon": "electron scripts/make-icon.cjs",
    "dist": "node build.mjs && electron-builder --win portable nsis"
  },
  "devDependencies": {}
}
```

(`devDependencies` zostaw dokładnie takie, jakie wpisał npm w Kroku 2.)

- [ ] **Step 4: Utwórz `.gitignore`**

```gitignore
node_modules/
dist/
release/
test-results/
playwright-report/
*.log
```

- [ ] **Step 5: Utwórz `build.mjs`**

```js
import * as esbuild from 'esbuild';
import { existsSync } from 'node:fs';

const watch = process.argv.includes('--watch');

const entryPoints = {
  renderer: 'src/renderer/main.js',
  app: 'src/styles/app.css',
  fonts: 'src/styles/fonts.css',
};
if (existsSync('src/renderer/present.js')) entryPoints.present = 'src/renderer/present.js';

const options = {
  entryPoints,
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome130',
  sourcemap: true,
  loader: { '.woff2': 'file' },
  // Chromium zawsze używa woff2 — pliki .woff nie są potrzebne w paczce.
  // jsPDF ma opcjonalne zależności, których nie używamy.
  external: ['*.woff', 'html2canvas', 'dompurify', 'canvg'],
  assetNames: 'fonts/[name]-[hash]',
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('Obserwuję zmiany…');
} else {
  await esbuild.build(options);
}
```

- [ ] **Step 6: Utwórz `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
```

- [ ] **Step 7: Utwórz `src/styles/fonts.css`**

```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/700.css';
@import '@fontsource/inter/400-italic.css';
@import '@fontsource/inter/700-italic.css';
@import '@fontsource/montserrat/400.css';
@import '@fontsource/montserrat/700.css';
@import '@fontsource/montserrat/400-italic.css';
@import '@fontsource/montserrat/700-italic.css';
@import '@fontsource/poppins/400.css';
@import '@fontsource/poppins/700.css';
@import '@fontsource/poppins/400-italic.css';
@import '@fontsource/poppins/700-italic.css';
@import '@fontsource/roboto/400.css';
@import '@fontsource/roboto/700.css';
@import '@fontsource/roboto/400-italic.css';
@import '@fontsource/roboto/700-italic.css';
@import '@fontsource/open-sans/400.css';
@import '@fontsource/open-sans/700.css';
@import '@fontsource/open-sans/400-italic.css';
@import '@fontsource/open-sans/700-italic.css';
@import '@fontsource/lato/400.css';
@import '@fontsource/lato/700.css';
@import '@fontsource/lato/400-italic.css';
@import '@fontsource/lato/700-italic.css';
@import '@fontsource/nunito/400.css';
@import '@fontsource/nunito/700.css';
@import '@fontsource/nunito/400-italic.css';
@import '@fontsource/nunito/700-italic.css';
@import '@fontsource/raleway/400.css';
@import '@fontsource/raleway/700.css';
@import '@fontsource/raleway/400-italic.css';
@import '@fontsource/raleway/700-italic.css';
@import '@fontsource/oswald/400.css';
@import '@fontsource/oswald/700.css';
@import '@fontsource/bebas-neue/400.css';
@import '@fontsource/playfair-display/400.css';
@import '@fontsource/playfair-display/700.css';
@import '@fontsource/playfair-display/400-italic.css';
@import '@fontsource/playfair-display/700-italic.css';
@import '@fontsource/merriweather/400.css';
@import '@fontsource/merriweather/700.css';
@import '@fontsource/merriweather/400-italic.css';
@import '@fontsource/merriweather/700-italic.css';
@import '@fontsource/lora/400.css';
@import '@fontsource/lora/700.css';
@import '@fontsource/lora/400-italic.css';
@import '@fontsource/lora/700-italic.css';
@import '@fontsource/caveat/400.css';
@import '@fontsource/caveat/700.css';
```

(Bebas Neue ma tylko 400, Oswald i Caveat nie mają kursywy — tak jest w paczkach 5.3.0; przeglądarka zrobi kursywę syntetyczną.)

- [ ] **Step 8: Utwórz `src/index.html`**

```html
<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; connect-src 'self' data: blob:">
  <title>Plakat Maker</title>
  <link rel="stylesheet" href="../dist/fonts.css">
  <link rel="stylesheet" href="../dist/app.css">
</head>
<body>
  <div id="app">
    <header id="toolbar"></header>
    <aside id="sidebar">
      <nav id="tabs"></nav>
      <div id="panel"></div>
    </aside>
    <main id="workspace">
      <div id="stage"></div>
      <div id="drop-overlay" hidden>Upuść zdjęcie lub projekt .plakat</div>
    </main>
    <footer id="statusbar"></footer>
  </div>
  <div id="modal-root"></div>
  <div id="toast-root"></div>
  <script src="../dist/renderer.js"></script>
</body>
</html>
```

- [ ] **Step 9: Utwórz `src/styles/app.css` (kompletny arkusz dla całej aplikacji)**

```css
:root {
  --bg: #14161c;
  --bg-2: #1b1e26;
  --bg-3: #242833;
  --line: #2f3442;
  --text: #e8eaf0;
  --muted: #9aa1b2;
  --accent: #4f8cff;
  --accent-2: #3a6fd6;
  --danger: #e5484d;
  --ok: #30a46c;
  --warn: #f5a524;
  --radius: 8px;
  --font: 'Inter', 'Segoe UI', sans-serif;
  color-scheme: dark;
}

* { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text); font: 13px/1.4 var(--font); }
body { overflow: hidden; user-select: none; }
input, textarea, select, button { font: inherit; color: inherit; }
textarea, input[type="text"], input[type="number"], input[type="url"], input[type="email"], input[type="tel"], input[type="password"] { user-select: text; }

#app {
  display: grid;
  grid-template-columns: 340px 1fr;
  grid-template-rows: 48px 1fr 28px;
  grid-template-areas: "toolbar toolbar" "sidebar workspace" "status status";
  height: 100vh;
}

/* Pasek narzędzi */
#toolbar { grid-area: toolbar; display: flex; align-items: center; gap: 6px; padding: 0 10px; background: var(--bg-2); border-bottom: 1px solid var(--line); }
.toolbar-group { display: flex; align-items: center; gap: 4px; }
.toolbar-sep { width: 1px; height: 24px; background: var(--line); margin: 0 6px; }
.spacer { flex: 1; }
.menu-wrap { position: relative; }
.menu { position: absolute; top: calc(100% + 4px); left: 0; min-width: 250px; z-index: 40; padding: 4px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.45); }
.menu-item { display: flex; justify-content: space-between; gap: 16px; width: 100%; padding: 7px 10px; border: 0; border-radius: 6px; background: transparent; cursor: pointer; text-align: left; }
.menu-item:hover { background: var(--bg-3); }
.menu-keys { color: var(--muted); font-size: 12px; }
.menu-sep { height: 1px; margin: 4px 6px; background: var(--line); }

/* Przyciski */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--bg-3); cursor: pointer; white-space: nowrap; }
.btn:hover { border-color: #46506a; background: #2b303d; }
.btn:disabled { opacity: .45; cursor: default; }
.btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn.primary:hover { background: var(--accent-2); }
.btn.danger { color: #fff; background: var(--danger); border-color: var(--danger); }
.btn.ghost { background: transparent; border-color: transparent; }
.btn.ghost:hover { background: var(--bg-3); }
.btn.active { border-color: var(--accent); color: #fff; background: #263a63; }
.btn.small { height: 24px; padding: 0 8px; font-size: 12px; }
.btn.icon { width: 30px; padding: 0; }
.btn-row { display: flex; flex-wrap: wrap; gap: 6px; }

/* Segmenty */
.seg { flex-shrink: 0; display: inline-flex; border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.seg button { white-space: nowrap; border: 0; background: var(--bg-3); padding: 0 10px; height: 28px; cursor: pointer; }
.seg button + button { border-left: 1px solid var(--line); }
.seg button.active { background: var(--accent); color: #fff; }

/* Panel boczny */
#sidebar { grid-area: sidebar; display: flex; flex-direction: column; min-height: 0; background: var(--bg-2); border-right: 1px solid var(--line); }
#tabs { display: flex; border-bottom: 1px solid var(--line); }
.tab { flex: 1; height: 38px; border: 0; background: transparent; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; }
.tab:hover { color: var(--text); }
.tab.active { color: var(--text); border-bottom-color: var(--accent); }
#panel { flex: 1; overflow-y: auto; padding: 8px 12px 40px; }

.section { border-bottom: 1px solid var(--line); padding: 4px 0 10px; }
.section > summary { cursor: pointer; list-style: none; font-weight: 600; padding: 8px 0; display: flex; align-items: center; justify-content: space-between; }
.section > summary::-webkit-details-marker { display: none; }
.section > summary::after { content: '▾'; color: var(--muted); }
.section:not([open]) > summary::after { content: '▸'; }

.field { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; }
.field > label, .field-label { color: var(--muted); font-size: 12px; display: flex; justify-content: space-between; }
.field input[type="text"], .field input[type="number"], .field input[type="url"], .field input[type="email"], .field input[type="tel"], .field input[type="password"], .field textarea, .field select {
  width: 100%; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); outline: none;
}
.field textarea { resize: vertical; min-height: 56px; }
.field input:focus, .field textarea:focus, .field select:focus { border-color: var(--accent); }
.field input[type="range"] { width: 100%; accent-color: var(--accent); }
.field-row { display: flex; align-items: center; gap: 8px; }
.field-row > * { flex: 1; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 8px; }
.four-col { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0 6px; }
.slider-value { color: var(--text); font-variant-numeric: tabular-nums; }
.toggle { display: flex; align-items: center; gap: 8px; margin: 8px 0; cursor: pointer; }
.toggle input { accent-color: var(--accent); width: 16px; height: 16px; }
.hint { color: var(--muted); font-size: 12px; margin: 4px 0; }
.warning { color: var(--warn); font-size: 12px; margin: 4px 0; }
.error-text { color: var(--danger); font-size: 12px; margin: 4px 0; }

/* Kolory */
.color-control { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.swatches { display: flex; flex-wrap: wrap; gap: 4px; }
.swatch { width: 22px; height: 22px; border-radius: 5px; border: 2px solid transparent; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(255,255,255,.15); }
.swatch.active { border-color: #fff; }
.color-native { width: 30px; height: 26px; padding: 0; border: 1px solid var(--line); border-radius: 5px; background: none; cursor: pointer; }

/* Karty (motywy, układy, szablony) */
.card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; }
.card-grid.three { grid-template-columns: repeat(3, 1fr); }
.card { border: 2px solid var(--line); border-radius: var(--radius); overflow: hidden; cursor: pointer; background: var(--bg-3); position: relative; }
.card:hover { border-color: #46506a; }
.card.active { border-color: var(--accent); }
.card-preview { height: 64px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.card-preview svg { width: 100%; height: 100%; display: block; }
.card-name { padding: 4px 6px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-delete { position: absolute; top: 4px; right: 4px; display: none; }
.card:hover .card-delete { display: inline-flex; }

/* Punkty */
.points-row { display: flex; gap: 4px; align-items: center; margin: 4px 0; }
.points-row input { flex: 1; min-width: 0; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); outline: none; }
.points-row input:focus { border-color: var(--accent); }

.thumb { width: 100%; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); display: block; }

/* Warstwy */
.layer-list { display: flex; flex-direction: column; gap: 2px; }
.layer-row { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 6px; cursor: pointer; }
.layer-row:hover { background: var(--bg-3); }
.layer-row.selected { background: #263a63; }
.layer-row.hidden-el .layer-name { opacity: .45; text-decoration: line-through; }
.layer-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.layer-type { color: var(--muted); font-size: 11px; width: 54px; }
.layer-actions { display: flex; gap: 2px; }

/* Obszar roboczy */
#workspace { grid-area: workspace; position: relative; min-width: 0; min-height: 0; overflow: hidden;
  background: #0d0f13 radial-gradient(circle at 1px 1px, #1d2029 1px, transparent 0) 0 0 / 22px 22px; }
#stage { position: absolute; inset: 0; }
#drop-overlay { position: absolute; inset: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 600;
  border: 3px dashed var(--accent); border-radius: 16px; background: rgba(79,140,255,.12); pointer-events: none; }
#drop-overlay[hidden] { display: none; }

/* Pasek stanu */
#statusbar { grid-area: status; display: flex; align-items: center; gap: 16px; padding: 0 12px; background: var(--bg-2); border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
.status-item { white-space: nowrap; }

/* Okna modalne */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal { width: min(720px, 92vw); max-height: 88vh; display: flex; flex-direction: column; background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
.modal.small { width: min(440px, 92vw); }
.modal.wide { width: min(980px, 94vw); }
.modal-title { padding: 14px 18px; font-size: 15px; font-weight: 700; border-bottom: 1px solid var(--line); }
.modal-body { padding: 14px 18px; overflow-y: auto; }
.modal-body p { white-space: pre-line; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--line); }

/* Powiadomienia */
#toast-root { position: fixed; right: 16px; bottom: 40px; display: flex; flex-direction: column; gap: 8px; z-index: 60; }
.toast { min-width: 240px; max-width: 420px; padding: 10px 14px; border-radius: 8px; background: var(--bg-3); border: 1px solid var(--line); box-shadow: 0 8px 24px rgba(0,0,0,.4); animation: toast-in .15s ease-out; }
.toast.error { border-color: var(--danger); }
.toast.success { border-color: var(--ok); }
@keyframes toast-in { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }

/* Pomoc skrótów */
.shortcut-table { width: 100%; border-collapse: collapse; }
.shortcut-table td { padding: 5px 4px; border-bottom: 1px solid var(--line); }
.kbd { display: inline-block; padding: 1px 6px; border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 4px; background: var(--bg); font-size: 12px; }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: #2f3442; border-radius: 5px; border: 2px solid var(--bg-2); }
```

- [ ] **Step 10: Utwórz startowy `electron/preload.cjs`**

```js
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {});
```

- [ ] **Step 11: Utwórz startowy `electron/main.js`**

```js
import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#14161c',
    title: 'Plakat Maker',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  win.webContents.on('before-input-event', (_event, input) => {
    if (!app.isPackaged && input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools();
  });
}

Menu.setApplicationMenu(null);
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
```

- [ ] **Step 12: Utwórz startowy `src/renderer/main.js`**

```js
import Konva from 'konva';

document.getElementById('statusbar').textContent = `Gotowe · Konva ${Konva.version}`;
```

- [ ] **Step 13: Zbuduj i uruchom**

Run: `npm start`
Expected: w konsoli esbuild wypisuje `dist/renderer.js`, `dist/app.css`, `dist/fonts.css`; otwiera się ciemne okno 1440×900 z pustym paskiem narzędzi, pustym panelem po lewej, kropkowanym obszarem roboczym i paskiem stanu „Gotowe · Konva 10.9.0”. Zamknij okno.

Run: `npx vitest run --passWithNoTests`
Expected: `No test files found, exiting with code 0`.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "chore: szkielet aplikacji Electron + esbuild + Vitest"
```

---
### Task 2: Kolory (`core/colors.js`)

**Files:**
- Create: `src/core/colors.js`
- Test: `tests/core/colors.test.js`

**Interfaces:**
- Consumes: nic.
- Produces:
  - `normalizeHex(value: string): string | null` — `#abc`/`#AABBCC` → `#aabbcc`, inaczej `null`
  - `hexToRgb(hex): { r, g, b }`, `rgbToHex({ r, g, b }): string`, `rgbToHsl({ r, g, b }): { h, s, l }` (h 0–360, s/l 0–1)
  - `relativeLuminance(hex): number`, `contrastRatio(a, b): number` (1–21)
  - `readableOn(bg, light = '#ffffff', dark = '#111111'): string`
  - `mix(a, b, t): string`, `withAlpha(hex, alpha): string` (`rgba(...)`)
  - `extractPalette(pixels: Uint8ClampedArray|number[], opts?): string[]` — dominujące kolory, od najczęstszego
  - `paletteFromImage(pixels): { bg, bg2, accent, text, muted } | null`

- [ ] **Step 1: Napisz testy**

`tests/core/colors.test.js`:
```js
import { describe, it, expect } from 'vitest';
import {
  normalizeHex, hexToRgb, rgbToHex, rgbToHsl, contrastRatio, readableOn, mix, withAlpha,
  extractPalette, paletteFromImage,
} from '../../src/core/colors.js';

function pixelsOf(...groups) {
  const out = [];
  for (const [hex, count, alpha = 255] of groups) {
    const { r, g, b } = hexToRgb(hex);
    for (let i = 0; i < count; i++) out.push(r, g, b, alpha);
  }
  return new Uint8ClampedArray(out);
}

describe('normalizeHex', () => {
  it('rozwija skrót i zmienia na małe litery', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex(' #FF0000 ')).toBe('#ff0000');
  });
  it('odrzuca błędne wartości', () => {
    expect(normalizeHex('red')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex(42)).toBeNull();
  });
});

describe('konwersje', () => {
  it('hex ↔ rgb', () => {
    expect(hexToRgb('#102030')).toEqual({ r: 16, g: 32, b: 48 });
    expect(rgbToHex({ r: 16, g: 32, b: 48 })).toBe('#102030');
    expect(rgbToHex({ r: 300, g: -5, b: 127.6 })).toBe('#ff0080');
  });
  it('rgb → hsl', () => {
    const red = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(red.h).toBeCloseTo(0);
    expect(red.s).toBeCloseTo(1);
    expect(red.l).toBeCloseTo(0.5);
    expect(rgbToHsl({ r: 128, g: 128, b: 128 }).s).toBe(0);
  });
});

describe('kontrast', () => {
  it('czarny na białym = 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
  });
  it('readableOn wybiera czytelny kolor', () => {
    expect(readableOn('#000000')).toBe('#ffffff');
    expect(readableOn('#ffffff')).toBe('#111111');
  });
});

describe('mix / withAlpha', () => {
  it('miesza kolory', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#ff0000', '#0000ff', 0)).toBe('#ff0000');
    expect(mix('#ff0000', '#0000ff', 1)).toBe('#0000ff');
  });
  it('zwraca rgba', () => {
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)');
  });
});

describe('extractPalette', () => {
  it('zwraca kolory od najczęstszego', () => {
    const px = pixelsOf(['#d02020', 600], ['#2040d0', 300], ['#20c040', 100]);
    const colors = extractPalette(px, { maxColors: 3 });
    expect(colors).toHaveLength(3);
    expect(colors[0]).toBe('#d02020');
    expect(colors[1]).toBe('#2040d0');
  });
  it('pomija przezroczyste piksele i podobne odcienie', () => {
    const px = pixelsOf(['#ffffff', 900, 0], ['#d02020', 120], ['#e02a2a', 100]);
    expect(extractPalette(px)).toEqual(['#d02020']);
  });
  it('pusta tablica → pusta paleta', () => {
    expect(extractPalette(new Uint8ClampedArray(0))).toEqual([]);
  });
});

describe('paletteFromImage', () => {
  it('daje ciemne tło, czytelny tekst i kontrastowy akcent', () => {
    const px = pixelsOf(['#3b5b7a', 500], ['#e0a030', 200], ['#202830', 300]);
    const p = paletteFromImage(px);
    expect(Object.keys(p).sort()).toEqual(['accent', 'bg', 'bg2', 'muted', 'text']);
    expect(contrastRatio(p.text, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.accent, p.bg)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.muted, p.bg)).toBeGreaterThanOrEqual(3);
  });
  it('zwraca null dla obrazu bez widocznych pikseli', () => {
    expect(paletteFromImage(pixelsOf(['#ffffff', 10, 0]))).toBeNull();
  });
});
```

- [ ] **Step 2: Uruchom testy — mają nie przejść**

Run: `npx vitest run tests/core/colors.test.js`
Expected: FAIL — `Failed to load url ../../src/core/colors.js` (plik nie istnieje).

- [ ] **Step 3: Zaimplementuj `src/core/colors.js`**

```js
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
```

- [ ] **Step 4: Uruchom testy — mają przejść**

Run: `npx vitest run tests/core/colors.test.js`
Expected: PASS (12 testów).

- [ ] **Step 5: Commit**

```bash
git add src/core/colors.js tests/core/colors.test.js
git commit -m "feat(core): narzędzia kolorów, kontrast WCAG i paleta ze zdjęcia"
```

---

### Task 3: Stałe, identyfikatory i model dokumentu

**Files:**
- Create: `src/core/constants.js`, `src/core/ids.js`, `src/core/model.js`
- Test: `tests/core/model.test.js`

**Interfaces:**
- Consumes: `normalizeHex` z `colors.js`.
- Produces:
  - `constants.js`: `SCHEMA_VERSION = 1`, `APP_ID = 'plakat-maker'`, `FILE_EXT = 'plakat'`, `ORIENTATIONS`, `FORMAT_PRESETS` (`[{ id, label, landscape: {w,h}, portrait: {w,h} }]`), `PALETTE_KEYS`, `MAX_POINTS = 6`, `MIN_BOX = 4`, `IMAGE_MAX_SIDE = 3000`, `SAFE_AREA = 0.05`, `HISTORY_LIMIT = 100`, `COALESCE_MS = 800`, `AUTOSAVE_DELAY_MS = 3000`, `BULLETS`, `ELEMENT_TYPES`, `ROLES`, `PHOTO_SHAPES`, `BACKGROUND_TYPES`, `PATTERNS`, `QR_MODULE_STYLES`, `QR_ECL`
  - `ids.js`: `newId(prefix = 'el'): string`
  - `model.js`: `ELEMENT_DEFAULTS`, `DEFAULT_PALETTE`, `DEFAULT_FONTS`, `DEFAULT_BACKGROUND`, `ROLE_NAMES`, `TYPE_NAMES`, `createElement(type, role = 'free', overrides = {})`, `createBaseDocument()`, `resolveColor(doc, value, fallback = '#000000')`, `resolveFont(doc, value)`, `currentFormat(doc)`, `getBox(doc, id, orientation = doc.orientation)`

- [ ] **Step 1: Napisz testy**

`tests/core/model.test.js`:
```js
import { describe, it, expect } from 'vitest';
import {
  ELEMENT_DEFAULTS, createElement, createBaseDocument, resolveColor, resolveFont, currentFormat, getBox,
} from '../../src/core/model.js';
import { newId } from '../../src/core/ids.js';
import { ROLES, ELEMENT_TYPES } from '../../src/core/constants.js';

describe('newId', () => {
  it('generuje unikalne identyfikatory z prefiksem', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId('x')));
    expect(ids.size).toBe(500);
    expect([...ids][0].startsWith('x_')).toBe(true);
  });
});

describe('createElement', () => {
  it('tworzy element z domyślnymi wartościami typu', () => {
    const el = createElement('text', 'title', { text: 'Cześć' });
    expect(el.type).toBe('text');
    expect(el.role).toBe('title');
    expect(el.text).toBe('Cześć');
    expect(el.size).toBe(ELEMENT_DEFAULTS.text.size);
    expect(el.locked).toBe(false);
    expect(el.name).toBe('Tytuł');
  });
  it('nie współdzieli zagnieżdżonych obiektów między elementami', () => {
    const a = createElement('photo', 'photo');
    const b = createElement('photo', 'free');
    a.crop.zoom = 3;
    expect(b.crop.zoom).toBe(1);
  });
  it('odrzuca nieznany typ', () => {
    expect(() => createElement('wideo')).toThrow(/Nieznany typ/);
  });
});

describe('createBaseDocument', () => {
  const doc = createBaseDocument();
  it('ma elementy dla wszystkich ról poza "free"', () => {
    const roles = Object.values(doc.elements).map((e) => e.role).sort();
    expect(roles).toEqual(ROLES.filter((r) => r !== 'free').sort());
  });
  it('kolejność zawiera wszystkie elementy, zdjęcie na spodzie', () => {
    expect(doc.order).toHaveLength(Object.keys(doc.elements).length);
    expect(doc.elements[doc.order[0]].role).toBe('photo');
  });
  it('ma formaty dla obu orientacji i puste ramki', () => {
    expect(doc.formats.landscape).toEqual({ w: 1920, h: 1080 });
    expect(doc.formats.portrait).toEqual({ w: 1080, h: 1920 });
    expect(doc.boxes).toEqual({ landscape: {}, portrait: {} });
  });
  it('używa tylko znanych typów', () => {
    for (const el of Object.values(doc.elements)) expect(ELEMENT_TYPES).toContain(el.type);
  });
});

describe('resolveColor / resolveFont', () => {
  const doc = createBaseDocument();
  it('rozwiązuje odwołania do palety', () => {
    expect(resolveColor(doc, 'palette:accent')).toBe(doc.palette.accent);
    expect(resolveColor(doc, '#ABCDEF')).toBe('#abcdef');
    expect(resolveColor(doc, 'palette:nieznany', '#123456')).toBe('#123456');
    expect(resolveColor(doc, 'zielony', '#654321')).toBe('#654321');
  });
  it('rozwiązuje czcionki', () => {
    expect(resolveFont(doc, 'heading')).toBe(doc.fonts.heading);
    expect(resolveFont(doc, 'body')).toBe(doc.fonts.body);
    expect(resolveFont(doc, 'Lora')).toBe('Lora');
  });
});

describe('currentFormat / getBox', () => {
  it('zwraca format i ramkę bieżącej orientacji', () => {
    const doc = createBaseDocument();
    doc.orientation = 'portrait';
    expect(currentFormat(doc)).toEqual({ w: 1080, h: 1920 });
    const id = doc.order[0];
    doc.boxes.portrait[id] = { x: 1, y: 2, w: 3, h: 4, rotation: 0, hidden: false };
    expect(getBox(doc, id)).toEqual(doc.boxes.portrait[id]);
    expect(getBox(doc, id, 'landscape')).toBeNull();
  });
});
```

- [ ] **Step 2: Uruchom testy — mają nie przejść**

Run: `npx vitest run tests/core/model.test.js`
Expected: FAIL — brak modułów.

- [ ] **Step 3: Utwórz `src/core/constants.js`**

```js
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
```

- [ ] **Step 4: Utwórz `src/core/ids.js`**

```js
let counter = 0;

export function newId(prefix = 'el') {
  counter = (counter + 1) % 1679616;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${time}${counter.toString(36)}${rand}`;
}
```

- [ ] **Step 5: Utwórz `src/core/model.js`**

```js
import { newId } from './ids.js';
import { normalizeHex } from './colors.js';

export const DEFAULT_PALETTE = { bg: '#0f172a', bg2: '#1e293b', accent: '#38bdf8', text: '#f8fafc', muted: '#94a3b8' };
export const DEFAULT_FONTS = { heading: 'Montserrat', body: 'Inter' };
export const DEFAULT_BACKGROUND = {
  type: 'linear',
  angle: 135,
  imageId: null,
  blur: 6,
  dim: 0.45,
  pattern: 'dots',
  patternColor: 'palette:accent',
  patternOpacity: 0.12,
  patternSize: 48,
};

export const ELEMENT_DEFAULTS = {
  photo: {
    assetId: null,
    shape: 'rounded',
    radius: 36,
    borderWidth: 0,
    borderColor: 'palette:accent',
    shadow: true,
    crop: { zoom: 1, x: 0.5, y: 0.5 },
    flipX: false,
    filters: { grayscale: 0, sepia: 0, brightness: 100, contrast: 100, saturation: 100, blur: 0 },
  },
  text: {
    text: 'Tekst',
    font: 'body',
    size: 48,
    bold: false,
    italic: false,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.2,
    align: 'left',
    valign: 'top',
    color: 'palette:text',
    shadow: false,
    strokeWidth: 0,
    strokeColor: '#000000',
    autoFit: true,
  },
  points: {
    items: ['Pierwszy ważny punkt', 'Drugi ważny punkt', 'Trzeci ważny punkt', 'Czwarty ważny punkt'],
    bullet: 'dot',
    customBullet: '•',
    bulletColor: 'palette:accent',
    font: 'body',
    size: 44,
    bold: false,
    color: 'palette:text',
    lineHeight: 1.25,
    spacing: 0.6,
    distribute: 'top',
    autoFit: true,
  },
  qr: {
    kind: 'url',
    data: { url: 'https://example.com' },
    fg: '#111111',
    bg: '#ffffff',
    moduleStyle: 'square',
    ecl: 'M',
    margin: 2,
    logoAssetId: null,
    caption: 'Zeskanuj mnie',
    captionColor: '#111111',
    card: true,
    cardRadius: 24,
  },
  image: { assetId: null, opacity: 1, radius: 0, fit: 'contain' },
  shape: { shape: 'rect', fill: 'palette:accent', stroke: 'palette:text', strokeWidth: 0, radius: 0, opacity: 1 },
};

export const ROLE_NAMES = {
  photo: 'Zdjęcie',
  title: 'Tytuł',
  subtitle: 'Podtytuł',
  points: 'Punkty',
  qr: 'Kod QR',
  accent: 'Pasek akcentu',
  panel: 'Panel',
  footer: 'Stopka',
};

export const TYPE_NAMES = { photo: 'Zdjęcie', text: 'Tekst', points: 'Punkty', qr: 'Kod QR', image: 'Obraz', shape: 'Kształt' };

export function createElement(type, role = 'free', overrides = {}) {
  const defaults = ELEMENT_DEFAULTS[type];
  if (!defaults) throw new Error(`Nieznany typ elementu: ${type}`);
  return {
    id: newId(type),
    type,
    role,
    name: ROLE_NAMES[role] ?? TYPE_NAMES[type],
    locked: false,
    ...structuredClone(defaults),
    ...structuredClone(overrides),
  };
}

export function createBaseDocument() {
  const elements = [
    createElement('photo', 'photo'),
    createElement('shape', 'panel', { fill: 'palette:bg', opacity: 0.85, radius: 32 }),
    createElement('shape', 'accent', { fill: 'palette:accent', radius: 6 }),
    createElement('text', 'title', { text: 'Twój tytuł', font: 'heading', size: 110, bold: true, lineHeight: 1.05 }),
    createElement('text', 'subtitle', { text: 'Krótki podtytuł lub hasło', size: 46, color: 'palette:muted' }),
    createElement('points', 'points'),
    createElement('qr', 'qr'),
    createElement('text', 'footer', { text: 'www.twojastrona.pl  ·  +48 123 456 789', size: 30, color: 'palette:muted', valign: 'bottom' }),
  ];
  return {
    version: 1,
    meta: { name: 'Plakat' },
    orientation: 'landscape',
    formatId: '16:9',
    formats: { landscape: { w: 1920, h: 1080 }, portrait: { w: 1080, h: 1920 } },
    themeId: 'nocny',
    layoutId: 'split-left',
    palette: { ...DEFAULT_PALETTE },
    fonts: { ...DEFAULT_FONTS },
    background: { ...DEFAULT_BACKGROUND },
    elements: Object.fromEntries(elements.map((e) => [e.id, e])),
    boxes: { landscape: {}, portrait: {} },
    order: elements.map((e) => e.id),
  };
}

export function resolveColor(doc, value, fallback = '#000000') {
  if (typeof value === 'string' && value.startsWith('palette:')) {
    return normalizeHex(doc.palette?.[value.slice(8)]) ?? fallback;
  }
  return normalizeHex(value) ?? fallback;
}

export function resolveFont(doc, value) {
  if (value === 'heading') return doc.fonts.heading;
  if (value === 'body') return doc.fonts.body;
  return value || doc.fonts.body;
}

export function currentFormat(doc) {
  return doc.formats[doc.orientation];
}

export function getBox(doc, id, orientation = doc.orientation) {
  return doc.boxes[orientation]?.[id] ?? null;
}
```

- [ ] **Step 6: Uruchom testy — mają przejść**

Run: `npx vitest run tests/core/model.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/constants.js src/core/ids.js src/core/model.js tests/core/model.test.js
git commit -m "feat(core): stałe, identyfikatory i model dokumentu"
```

---
### Task 4: Schemat pliku — serializacja, walidacja, normalizacja, migracje

**Files:**
- Create: `src/core/schema.js`
- Test: `tests/core/schema.test.js`

**Interfaces:**
- Consumes: stałe z `constants.js`; `ELEMENT_DEFAULTS, DEFAULT_PALETTE, DEFAULT_FONTS, DEFAULT_BACKGROUND, ROLE_NAMES, TYPE_NAMES, createBaseDocument` z `model.js`; `normalizeHex` z `colors.js`.
- Produces:
  - `class ProjectError extends Error` — komunikat po polsku, gotowy do pokazania użytkownikowi
  - `mergeWithDefaults(defaults, value): object` — kopia `defaults` z wartościami z `value` o zgodnym typie
  - `normalizeColorValue(value): string | null`
  - `normalizeDocument(raw, warnings: string[] = []): doc` (rzuca `ProjectError`, gdy `raw` nie jest obiektem)
  - `collectAssetIds(doc): Set<string>`
  - `projectToObject(doc, assets): { app, version, doc, assets }` (tylko używane zasoby)
  - `projectFromObject(obj): { doc, assets, warnings }`
  - `serializeProject(doc, assets): string`
  - `parseProject(text: string): { doc, assets, warnings }`

- [ ] **Step 1: Napisz testy**

`tests/core/schema.test.js`:
```js
import { describe, it, expect } from 'vitest';
import {
  ProjectError, mergeWithDefaults, normalizeDocument, collectAssetIds, serializeProject, parseProject, projectToObject,
} from '../../src/core/schema.js';
import { createBaseDocument, DEFAULT_PALETTE, ELEMENT_DEFAULTS } from '../../src/core/model.js';
import { SCHEMA_VERSION, MIN_BOX } from '../../src/core/constants.js';

function withBoxes(doc) {
  for (const o of ['landscape', 'portrait']) {
    doc.order.forEach((id, i) => {
      doc.boxes[o][id] = { x: 10 * i, y: 20 * i, w: 300, h: 120, rotation: 0, hidden: false };
    });
  }
  return doc;
}

function photoOf(doc) {
  return Object.values(doc.elements).find((e) => e.role === 'photo');
}

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('mergeWithDefaults', () => {
  it('uzupełnia brakujące i odrzuca złe typy', () => {
    const out = mergeWithDefaults({ a: 1, b: 'x', c: { d: true }, e: [1], f: null }, { a: 'zle', c: {}, e: 'nie', f: 'asset_1', z: 9 });
    expect(out).toEqual({ a: 1, b: 'x', c: { d: true }, e: [1], f: 'asset_1' });
  });
  it('odrzuca NaN i Infinity', () => {
    expect(mergeWithDefaults({ n: 5 }, { n: NaN })).toEqual({ n: 5 });
    expect(mergeWithDefaults({ n: 5 }, { n: Infinity })).toEqual({ n: 5 });
  });
  it('pole "data" zachowuje dowolne klucze tekstowe', () => {
    const out = mergeWithDefaults({ data: { url: '' } }, { data: { ssid: 'Dom', password: 'x', bad: 5 } });
    expect(out.data).toEqual({ ssid: 'Dom', password: 'x' });
  });
});

describe('serializacja w obie strony', () => {
  it('zachowuje dokument i usuwa nieużywane zasoby', () => {
    const doc = withBoxes(createBaseDocument());
    photoOf(doc).assetId = 'asset_a';
    const assets = { asset_a: { dataUrl: PNG, w: 10, h: 10, name: 'a.png' }, asset_b: { dataUrl: PNG, w: 1, h: 1, name: 'b.png' } };
    const parsed = parseProject(serializeProject(doc, assets));
    expect(parsed.doc).toEqual(doc);
    expect(Object.keys(parsed.assets)).toEqual(['asset_a']);
    expect(parsed.warnings).toEqual([]);
  });
  it('projectToObject zapisuje nagłówek aplikacji i wersję', () => {
    const obj = projectToObject(createBaseDocument(), {});
    expect(obj.app).toBe('plakat-maker');
    expect(obj.version).toBe(SCHEMA_VERSION);
  });
});

describe('parseProject — błędy', () => {
  it('uszkodzony JSON', () => {
    expect(() => parseProject('{nie json')).toThrow(ProjectError);
    expect(() => parseProject('{nie json')).toThrow(/uszkodzony/);
  });
  it('obcy plik', () => {
    expect(() => parseProject(JSON.stringify({ app: 'inna', version: 1, doc: {} }))).toThrow(/nie jest plikiem projektu/);
  });
  it('nowsza wersja', () => {
    expect(() => parseProject(JSON.stringify({ app: 'plakat-maker', version: 99, doc: {} }))).toThrow(/nowszej wersji/);
  });
  it('brak dokumentu', () => {
    expect(() => parseProject(JSON.stringify({ app: 'plakat-maker', version: 1 }))).toThrow(ProjectError);
  });
});

describe('normalizeDocument — naprawa danych', () => {
  it('pomija nieznane elementy i porządkuje kolejność', () => {
    const doc = withBoxes(createBaseDocument());
    doc.elements.zly = { id: 'zly', type: 'wideo' };
    doc.order = ['nie_ma', ...doc.order.slice(1), doc.order[0], doc.order[0]];
    const warnings = [];
    const out = normalizeDocument(doc, warnings);
    expect(out.elements.zly).toBeUndefined();
    expect(out.order).toHaveLength(Object.keys(out.elements).length);
    expect(new Set(out.order).size).toBe(out.order.length);
    expect(warnings.some((w) => w.includes('wideo'))).toBe(true);
  });
  it('naprawia kolory palety i elementów', () => {
    const doc = withBoxes(createBaseDocument());
    doc.palette.accent = 'bardzo-niebieski';
    const title = Object.values(doc.elements).find((e) => e.role === 'title');
    title.color = 'palette:nieznany';
    const out = normalizeDocument(doc);
    expect(out.palette.accent).toBe(DEFAULT_PALETTE.accent);
    expect(out.elements[title.id].color).toBe(ELEMENT_DEFAULTS.text.color);
  });
  it('uzupełnia zagnieżdżone pola i wartości wyliczeniowe', () => {
    const doc = withBoxes(createBaseDocument());
    const photo = photoOf(doc);
    delete photo.crop;
    photo.shape = 'trójkąt';
    const out = normalizeDocument(doc);
    expect(out.elements[photo.id].crop).toEqual({ zoom: 1, x: 0.5, y: 0.5 });
    expect(out.elements[photo.id].shape).toBe(ELEMENT_DEFAULTS.photo.shape);
  });
  it('ogranicza listę punktów do 6 tekstów', () => {
    const doc = withBoxes(createBaseDocument());
    const points = Object.values(doc.elements).find((e) => e.type === 'points');
    points.items = ['1', 2, '3', '4', '5', '6', '7', '8'];
    const out = normalizeDocument(doc);
    expect(out.elements[points.id].items).toEqual(['1', '3', '4', '5', '6', '7']);
  });
  it('naprawia ramki: brak → domyślna, za mała → minimum', () => {
    const doc = withBoxes(createBaseDocument());
    const [a, b] = doc.order;
    delete doc.boxes.landscape[a];
    doc.boxes.landscape[b] = { x: 5, y: 5, w: 2, h: NaN, rotation: 'x', hidden: 'tak' };
    const warnings = [];
    const out = normalizeDocument(doc, warnings);
    expect(out.boxes.landscape[a]).toMatchObject({ w: 768, h: 216, hidden: false });
    expect(out.boxes.landscape[b]).toEqual({ x: 5, y: 5, w: MIN_BOX, h: MIN_BOX, rotation: 0, hidden: false });
    expect(warnings.some((w) => w.includes('pozycji'))).toBe(true);
  });
  it('rzuca ProjectError dla nie-obiektu', () => {
    expect(() => normalizeDocument(null)).toThrow(ProjectError);
  });
});

describe('zasoby', () => {
  it('collectAssetIds zbiera wszystkie odwołania', () => {
    const doc = createBaseDocument();
    photoOf(doc).assetId = 'a1';
    Object.values(doc.elements).find((e) => e.type === 'qr').logoAssetId = 'a2';
    doc.background.imageId = 'a3';
    expect([...collectAssetIds(doc)].sort()).toEqual(['a1', 'a2', 'a3']);
  });
  it('usuwa odwołania do brakujących lub uszkodzonych zasobów', () => {
    const doc = withBoxes(createBaseDocument());
    photoOf(doc).assetId = 'zgubiony';
    doc.background.imageId = 'zly';
    const text = JSON.stringify({ app: 'plakat-maker', version: 1, doc, assets: { zly: { dataUrl: 'javascript:alert(1)' } } });
    const parsed = parseProject(text);
    expect(photoOf(parsed.doc).assetId).toBeNull();
    expect(parsed.doc.background.imageId).toBeNull();
    expect(parsed.assets).toEqual({});
    expect(parsed.warnings.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Uruchom testy — mają nie przejść**

Run: `npx vitest run tests/core/schema.test.js`
Expected: FAIL — brak `schema.js`.

- [ ] **Step 3: Zaimplementuj `src/core/schema.js`**

```js
import {
  SCHEMA_VERSION, APP_ID, ORIENTATIONS, PALETTE_KEYS, MAX_POINTS, MIN_BOX, MIN_FORMAT, MAX_FORMAT,
  FORMAT_PRESETS, ELEMENT_TYPES, ROLES, BACKGROUND_TYPES, PATTERNS, PHOTO_SHAPES, SHAPE_KINDS, BULLETS,
  QR_MODULE_STYLES, QR_ECL, TEXT_ALIGN, TEXT_VALIGN,
} from './constants.js';
import {
  ELEMENT_DEFAULTS, DEFAULT_PALETTE, DEFAULT_FONTS, DEFAULT_BACKGROUND, ROLE_NAMES, TYPE_NAMES,
} from './model.js';
import { normalizeHex } from './colors.js';

export class ProjectError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProjectError';
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const text = (v, fallback, max = 120) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : fallback);

const ENUMS = {
  photo: { shape: Object.keys(PHOTO_SHAPES) },
  text: { align: Object.keys(TEXT_ALIGN), valign: Object.keys(TEXT_VALIGN) },
  points: { bullet: Object.keys(BULLETS), distribute: ['top', 'spread'] },
  qr: {
    kind: ['url', 'text', 'wifi', 'email', 'phone', 'vcard'],
    moduleStyle: Object.keys(QR_MODULE_STYLES),
    ecl: Object.keys(QR_ECL),
  },
  image: { fit: ['contain', 'cover'] },
  shape: { shape: Object.keys(SHAPE_KINDS) },
};

const COLOR_FIELDS = {
  photo: ['borderColor'],
  text: ['color', 'strokeColor'],
  points: ['bulletColor', 'color'],
  qr: ['fg', 'bg', 'captionColor'],
  image: [],
  shape: ['fill', 'stroke'],
};

// Kolejne wersje schematu: MIGRATIONS[n] zamienia obiekt w wersji n na wersję n + 1.
const MIGRATIONS = {};

export function mergeWithDefaults(defaults, value) {
  const src = isPlainObject(value) ? value : {};
  const out = {};
  for (const [key, def] of Object.entries(defaults)) {
    const v = src[key];
    if (key === 'data' && isPlainObject(def)) {
      out[key] = isPlainObject(v)
        ? Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'string'))
        : structuredClone(def);
    } else if (isPlainObject(def)) {
      out[key] = mergeWithDefaults(def, v);
    } else if (Array.isArray(def)) {
      out[key] = Array.isArray(v) ? structuredClone(v) : structuredClone(def);
    } else if (def === null) {
      out[key] = typeof v === 'string' ? v : null;
    } else if (typeof def === 'number') {
      out[key] = finite(v, def);
    } else {
      out[key] = typeof v === typeof def ? v : def;
    }
  }
  return out;
}

export function normalizeColorValue(value) {
  if (typeof value === 'string' && value.startsWith('palette:')) {
    return PALETTE_KEYS.includes(value.slice(8)) ? value : null;
  }
  return normalizeHex(value);
}

function normalizeElement(id, raw, warnings) {
  if (!isPlainObject(raw) || !ELEMENT_TYPES.includes(raw.type)) {
    warnings.push(`Pominięto nieznany element (${raw?.type ?? 'brak typu'}).`);
    return null;
  }
  const type = raw.type;
  const role = ROLES.includes(raw.role) ? raw.role : 'free';
  const defaults = ELEMENT_DEFAULTS[type];
  const el = {
    id,
    type,
    role,
    name: text(raw.name, ROLE_NAMES[role] ?? TYPE_NAMES[type], 80),
    locked: raw.locked === true,
    ...mergeWithDefaults(defaults, raw),
  };
  for (const [key, allowed] of Object.entries(ENUMS[type])) {
    if (!allowed.includes(el[key])) el[key] = defaults[key];
  }
  for (const key of COLOR_FIELDS[type]) {
    el[key] = normalizeColorValue(el[key]) ?? defaults[key];
  }
  if (type === 'points') {
    el.items = el.items.filter((x) => typeof x === 'string').slice(0, MAX_POINTS);
    if (!el.items.length) el.items = [''];
  }
  return el;
}

function normalizeFormat(raw, fallback) {
  const ok = (v) => Number.isInteger(v) && v >= MIN_FORMAT && v <= MAX_FORMAT;
  return isPlainObject(raw) && ok(raw.w) && ok(raw.h) ? { w: raw.w, h: raw.h } : { ...fallback };
}

function defaultBox(format) {
  return {
    x: Math.round(format.w * 0.3),
    y: Math.round(format.h * 0.4),
    w: Math.round(format.w * 0.4),
    h: Math.round(format.h * 0.2),
    rotation: 0,
    hidden: false,
  };
}

function normalizeBox(raw) {
  if (!isPlainObject(raw)) return null;
  return {
    x: finite(raw.x, 0),
    y: finite(raw.y, 0),
    w: Math.max(MIN_BOX, finite(raw.w, MIN_BOX)),
    h: Math.max(MIN_BOX, finite(raw.h, MIN_BOX)),
    rotation: finite(raw.rotation, 0),
    hidden: raw.hidden === true,
  };
}

export function normalizeDocument(raw, warnings = []) {
  if (!isPlainObject(raw)) throw new ProjectError('Plik nie zawiera dokumentu plakatu.');

  const elements = {};
  for (const [id, el] of Object.entries(isPlainObject(raw.elements) ? raw.elements : {})) {
    const normalized = normalizeElement(id, el, warnings);
    if (normalized) elements[id] = normalized;
  }
  const ids = Object.keys(elements);

  const order = [...new Set((Array.isArray(raw.order) ? raw.order : []).filter((id) => elements[id]))];
  for (const id of ids) if (!order.includes(id)) order.push(id);

  const formats = {};
  for (const o of ORIENTATIONS) formats[o] = normalizeFormat(raw.formats?.[o], FORMAT_PRESETS[0][o]);

  let missingBoxes = false;
  const boxes = {};
  for (const o of ORIENTATIONS) {
    boxes[o] = {};
    const src = isPlainObject(raw.boxes?.[o]) ? raw.boxes[o] : {};
    for (const id of ids) {
      const box = normalizeBox(src[id]);
      if (!box) missingBoxes = true;
      boxes[o][id] = box ?? defaultBox(formats[o]);
    }
  }
  if (missingBoxes) warnings.push('Niektóre elementy nie miały pozycji — ustawiono je na środku plakatu.');

  const palette = {};
  for (const k of PALETTE_KEYS) palette[k] = normalizeHex(raw.palette?.[k]) ?? DEFAULT_PALETTE[k];

  const background = mergeWithDefaults(DEFAULT_BACKGROUND, raw.background);
  if (!(background.type in BACKGROUND_TYPES)) background.type = DEFAULT_BACKGROUND.type;
  if (!(background.pattern in PATTERNS)) background.pattern = DEFAULT_BACKGROUND.pattern;
  background.patternColor = normalizeColorValue(background.patternColor) ?? DEFAULT_BACKGROUND.patternColor;

  return {
    version: SCHEMA_VERSION,
    meta: { name: text(raw.meta?.name, 'Plakat') },
    orientation: ORIENTATIONS.includes(raw.orientation) ? raw.orientation : 'landscape',
    formatId: text(raw.formatId, '16:9', 20),
    formats,
    themeId: text(raw.themeId, 'nocny', 60),
    layoutId: text(raw.layoutId, 'split-left', 60),
    palette,
    fonts: { heading: text(raw.fonts?.heading, DEFAULT_FONTS.heading, 60), body: text(raw.fonts?.body, DEFAULT_FONTS.body, 60) },
    background,
    elements,
    boxes,
    order,
  };
}

export function collectAssetIds(doc) {
  const ids = new Set();
  for (const el of Object.values(doc.elements)) {
    if ((el.type === 'photo' || el.type === 'image') && el.assetId) ids.add(el.assetId);
    if (el.type === 'qr' && el.logoAssetId) ids.add(el.logoAssetId);
  }
  if (doc.background?.imageId) ids.add(doc.background.imageId);
  return ids;
}

function normalizeAssets(raw, warnings) {
  const out = {};
  for (const [id, a] of Object.entries(isPlainObject(raw) ? raw : {})) {
    if (isPlainObject(a) && typeof a.dataUrl === 'string' && a.dataUrl.startsWith('data:image/')) {
      out[id] = { dataUrl: a.dataUrl, w: finite(a.w, 0), h: finite(a.h, 0), name: text(a.name, 'obraz') };
    } else {
      warnings.push('Pominięto uszkodzony obraz zapisany w projekcie.');
    }
  }
  return out;
}

function dropMissingAssetRefs(doc, assets, warnings) {
  const missing = () => warnings.push('Brakuje obrazu użytego w projekcie — usunięto odwołanie.');
  for (const el of Object.values(doc.elements)) {
    if ((el.type === 'photo' || el.type === 'image') && el.assetId && !assets[el.assetId]) {
      el.assetId = null;
      missing();
    }
    if (el.type === 'qr' && el.logoAssetId && !assets[el.logoAssetId]) {
      el.logoAssetId = null;
      missing();
    }
  }
  if (doc.background.imageId && !assets[doc.background.imageId]) {
    doc.background.imageId = null;
    missing();
  }
}

export function projectToObject(doc, assets) {
  const used = collectAssetIds(doc);
  const usedAssets = {};
  for (const id of used) if (assets[id]) usedAssets[id] = assets[id];
  return { app: APP_ID, version: SCHEMA_VERSION, doc, assets: usedAssets };
}

function migrate(obj) {
  let version = obj.version;
  if (!Number.isInteger(version) || version < 1) throw new ProjectError('Nieznana wersja pliku projektu.');
  if (version > SCHEMA_VERSION) {
    throw new ProjectError('Projekt został zapisany w nowszej wersji programu. Zaktualizuj Plakat Maker.');
  }
  let current = obj;
  while (version < SCHEMA_VERSION) {
    current = MIGRATIONS[version](current);
    version++;
  }
  return current;
}

export function projectFromObject(obj) {
  if (!isPlainObject(obj) || obj.app !== APP_ID) throw new ProjectError('Ten plik nie jest plikiem projektu Plakat Maker.');
  const migrated = migrate(obj);
  const warnings = [];
  const doc = normalizeDocument(migrated.doc, warnings);
  const assets = normalizeAssets(migrated.assets, warnings);
  dropMissingAssetRefs(doc, assets, warnings);
  return { doc, assets, warnings };
}

export function serializeProject(doc, assets) {
  return JSON.stringify(projectToObject(doc, assets));
}

export function parseProject(textContent) {
  let obj;
  try {
    obj = JSON.parse(textContent);
  } catch {
    throw new ProjectError('Plik projektu jest uszkodzony (niepoprawny format).');
  }
  return projectFromObject(obj);
}
```

- [ ] **Step 4: Uruchom testy — mają przejść**

Run: `npx vitest run tests/core/schema.test.js`
Expected: PASS. (Ramka domyślna dla 1920×1080: `x 576, y 432, w 768, h 216`.)

- [ ] **Step 5: Commit**

```bash
git add src/core/schema.js tests/core/schema.test.js
git commit -m "feat(core): schemat projektu z walidacją, naprawą danych i migracjami"
```

---
### Task 5: Historia, magazyn stanu i zaznaczenie

**Files:**
- Create: `src/core/history.js`, `src/core/store.js`, `src/core/selection.js`
- Test: `tests/core/history.test.js`, `tests/core/store.test.js`, `tests/core/selection.test.js`

**Interfaces:**
- Consumes: `HISTORY_LIMIT`, `COALESCE_MS` z `constants.js`; `newId` z `ids.js`.
- Produces:
  - `createHistory({ limit, coalesceMs, now })` → `{ record(snapshot, key), undo(current), redo(current), canUndo(), canRedo(), clear(), breakCoalescing() }`
  - `createStore(initialDoc, { history })` → obiekt z getterami `doc`, `assets`, `dirty` i metodami:
    - `subscribe(fn: (doc, change: { reason: string }) => void): () => void`
    - `update(recipe: (draft) => void | false, opts?: { history?: boolean, key?: string, reason?: string }): boolean`
    - `addAsset(asset: { dataUrl, w, h, name }): string` (zwraca `assetId`, nie emituje zmiany)
    - `getAsset(id): asset | null`
    - `replace(doc, assets, { dirty = false })` — czyści historię, emituje `reason: 'load'`
    - `undo(): boolean`, `redo(): boolean`, `canUndo()`, `canRedo()`
    - `markSaved()` — emituje `reason: 'saved'`
    - `breakCoalescing()`
  - `createSelection()` → `{ ids, cropId, set(ids), toggle(id), clear(), setCrop(id | null), prune(doc), has(id), subscribe(fn) }`

- [ ] **Step 1: Napisz testy historii**

`tests/core/history.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { createHistory } from '../../src/core/history.js';

function clock() {
  let t = 0;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

describe('createHistory', () => {
  it('cofa i ponawia', () => {
    const h = createHistory();
    h.record('A');
    h.record('B');
    expect(h.undo('C')).toBe('B');
    expect(h.undo('B')).toBe('A');
    expect(h.undo('A')).toBeNull();
    expect(h.redo('A')).toBe('B');
    expect(h.redo('B')).toBe('C');
    expect(h.canRedo()).toBe(false);
  });
  it('nowa zmiana czyści przyszłość', () => {
    const h = createHistory();
    h.record('A');
    h.undo('B');
    h.record('A');
    expect(h.canRedo()).toBe(false);
  });
  it('scala zmiany z tym samym kluczem w oknie czasu', () => {
    const c = clock();
    const h = createHistory({ coalesceMs: 800, now: c.now });
    h.record('A', 'title');
    c.advance(300);
    h.record('A1', 'title');
    c.advance(300);
    h.record('A2', 'title');
    expect(h.undo('A3')).toBe('A');
    expect(h.canUndo()).toBe(false);
  });
  it('nie scala po upływie czasu ani dla innego klucza', () => {
    const c = clock();
    const h = createHistory({ coalesceMs: 800, now: c.now });
    h.record('A', 'k');
    c.advance(900);
    h.record('B', 'k');
    h.record('C', 'inny');
    expect(h.undo('D')).toBe('C');
    expect(h.undo('C')).toBe('B');
    expect(h.undo('B')).toBe('A');
  });
  it('breakCoalescing wymusza nowy krok', () => {
    const h = createHistory();
    h.record('A', 'k');
    h.breakCoalescing();
    h.record('B', 'k');
    expect(h.undo('C')).toBe('B');
  });
  it('pilnuje limitu', () => {
    const h = createHistory({ limit: 3 });
    ['A', 'B', 'C', 'D'].forEach((s) => h.record(s));
    expect(h.undo('E')).toBe('D');
    expect(h.undo('D')).toBe('C');
    expect(h.undo('C')).toBe('B');
    expect(h.undo('B')).toBeNull();
  });
});
```

- [ ] **Step 2: Napisz testy magazynu**

`tests/core/store.test.js`:
```js
import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../../src/core/store.js';

const base = () => ({ n: 1, list: [1] });

describe('createStore', () => {
  it('update działa na kopii i powiadamia subskrybentów', () => {
    const initial = base();
    const store = createStore(initial);
    const fn = vi.fn();
    store.subscribe(fn);
    store.update((d) => { d.n = 2; d.list.push(2); });
    expect(initial).toEqual({ n: 1, list: [1] });
    expect(store.doc).toEqual({ n: 2, list: [1, 2] });
    expect(fn).toHaveBeenCalledWith(store.doc, { reason: 'edit' });
    expect(store.dirty).toBe(true);
  });
  it('recipe zwracający false nic nie zmienia', () => {
    const store = createStore(base());
    const fn = vi.fn();
    store.subscribe(fn);
    expect(store.update(() => false)).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    expect(store.canUndo()).toBe(false);
    expect(store.dirty).toBe(false);
  });
  it('cofa i ponawia', () => {
    const store = createStore(base());
    store.update((d) => { d.n = 2; });
    store.update((d) => { d.n = 3; });
    expect(store.undo()).toBe(true);
    expect(store.doc.n).toBe(2);
    expect(store.redo()).toBe(true);
    expect(store.doc.n).toBe(3);
  });
  it('history: false nie zapisuje kroku', () => {
    const store = createStore(base());
    store.update((d) => { d.n = 5; }, { history: false });
    expect(store.canUndo()).toBe(false);
    expect(store.doc.n).toBe(5);
  });
  it('replace czyści historię i ustawia flagę', () => {
    const store = createStore(base());
    store.update((d) => { d.n = 2; });
    const fn = vi.fn();
    store.subscribe(fn);
    store.replace({ n: 9, list: [] }, { a: { dataUrl: 'data:image/png;base64,' } });
    expect(store.canUndo()).toBe(false);
    expect(store.dirty).toBe(false);
    expect(store.getAsset('a')).toBeTruthy();
    expect(fn).toHaveBeenCalledWith(store.doc, { reason: 'load' });
  });
  it('markSaved zeruje flagę', () => {
    const store = createStore(base());
    store.update((d) => { d.n = 2; });
    store.markSaved();
    expect(store.dirty).toBe(false);
  });
  it('addAsset zwraca nowy identyfikator', () => {
    const store = createStore(base());
    const id = store.addAsset({ dataUrl: 'data:image/png;base64,', w: 1, h: 1, name: 'x' });
    expect(store.getAsset(id).name).toBe('x');
    expect(store.getAsset('nie')).toBeNull();
  });
  it('wyjątek subskrybenta nie psuje innych', () => {
    const store = createStore(base());
    const good = vi.fn();
    store.subscribe(() => { throw new Error('boom'); });
    store.subscribe(good);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    store.update((d) => { d.n = 2; });
    expect(good).toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

- [ ] **Step 3: Napisz testy zaznaczenia**

`tests/core/selection.test.js`:
```js
import { describe, it, expect, vi } from 'vitest';
import { createSelection } from '../../src/core/selection.js';

describe('createSelection', () => {
  it('ustawia, przełącza i czyści', () => {
    const s = createSelection();
    const fn = vi.fn();
    s.subscribe(fn);
    s.set(['a']);
    s.toggle('b');
    expect(s.ids).toEqual(['a', 'b']);
    s.toggle('a');
    expect(s.ids).toEqual(['b']);
    expect(s.has('b')).toBe(true);
    s.clear();
    expect(s.ids).toEqual([]);
    expect(fn).toHaveBeenCalledTimes(4);
  });
  it('tryb kadrowania jest kasowany przy zmianie zaznaczenia', () => {
    const s = createSelection();
    s.set(['p']);
    s.setCrop('p');
    expect(s.cropId).toBe('p');
    s.set(['q']);
    expect(s.cropId).toBeNull();
  });
  it('prune usuwa nieistniejące elementy', () => {
    const s = createSelection();
    s.set(['a', 'b']);
    s.setCrop('b');
    s.prune({ elements: { a: {} } });
    expect(s.ids).toEqual(['a']);
    expect(s.cropId).toBeNull();
  });
  it('nie powiadamia, gdy nic się nie zmienia', () => {
    const s = createSelection();
    s.set(['a']);
    const fn = vi.fn();
    s.subscribe(fn);
    s.set(['a']);
    s.prune({ elements: { a: {} } });
    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Uruchom testy — mają nie przejść**

Run: `npx vitest run tests/core/history.test.js tests/core/store.test.js tests/core/selection.test.js`
Expected: FAIL — brak modułów.

- [ ] **Step 5: Zaimplementuj `src/core/history.js`**

```js
import { HISTORY_LIMIT, COALESCE_MS } from './constants.js';

export function createHistory({ limit = HISTORY_LIMIT, coalesceMs = COALESCE_MS, now = () => Date.now() } = {}) {
  let past = [];
  let future = [];
  let lastKey = null;
  let lastTime = 0;

  return {
    record(snapshot, key = null) {
      const t = now();
      if (key && key === lastKey && t - lastTime < coalesceMs) {
        lastTime = t;
        return;
      }
      past.push(snapshot);
      if (past.length > limit) past.shift();
      future = [];
      lastKey = key;
      lastTime = t;
    },
    undo(current) {
      if (!past.length) return null;
      future.push(current);
      lastKey = null;
      return past.pop();
    },
    redo(current) {
      if (!future.length) return null;
      past.push(current);
      lastKey = null;
      return future.pop();
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() {
      past = [];
      future = [];
      lastKey = null;
    },
    breakCoalescing() {
      lastKey = null;
    },
  };
}
```

- [ ] **Step 6: Zaimplementuj `src/core/store.js`**

```js
import { createHistory } from './history.js';
import { newId } from './ids.js';

export function createStore(initialDoc, { history = createHistory() } = {}) {
  let doc = initialDoc;
  let assets = {};
  let dirty = false;
  const listeners = new Set();

  function emit(change) {
    for (const listener of [...listeners]) {
      try {
        listener(doc, change);
      } catch (err) {
        console.error('Błąd subskrybenta store:', err);
      }
    }
  }

  return {
    get doc() { return doc; },
    get assets() { return assets; },
    get dirty() { return dirty; },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    update(recipe, { history: useHistory = true, key = null, reason = 'edit' } = {}) {
      const draft = structuredClone(doc);
      if (recipe(draft) === false) return false;
      if (useHistory) history.record(doc, key);
      doc = draft;
      dirty = true;
      emit({ reason });
      return true;
    },

    addAsset(asset) {
      const id = newId('asset');
      assets = { ...assets, [id]: asset };
      return id;
    },

    getAsset(id) {
      return (id && assets[id]) || null;
    },

    replace(nextDoc, nextAssets = {}, { dirty: nextDirty = false } = {}) {
      doc = nextDoc;
      assets = { ...nextAssets };
      history.clear();
      dirty = nextDirty;
      emit({ reason: 'load' });
    },

    undo() {
      const prev = history.undo(doc);
      if (!prev) return false;
      doc = prev;
      dirty = true;
      emit({ reason: 'undo' });
      return true;
    },

    redo() {
      const next = history.redo(doc);
      if (!next) return false;
      doc = next;
      dirty = true;
      emit({ reason: 'redo' });
      return true;
    },

    canUndo: () => history.canUndo(),
    canRedo: () => history.canRedo(),

    markSaved() {
      dirty = false;
      emit({ reason: 'saved' });
    },

    breakCoalescing() {
      history.breakCoalescing();
    },
  };
}
```

- [ ] **Step 7: Zaimplementuj `src/core/selection.js`**

```js
export function createSelection() {
  let ids = [];
  let cropId = null;
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn({ ids, cropId }));
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  return {
    get ids() { return ids; },
    get cropId() { return cropId; },
    has: (id) => ids.includes(id),

    set(nextIds) {
      const next = [...new Set(nextIds)];
      if (same(next, ids) && (cropId === null || next.includes(cropId))) return;
      ids = next;
      if (!ids.includes(cropId)) cropId = null;
      emit();
    },

    toggle(id) {
      this.set(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    },

    clear() {
      this.set([]);
    },

    setCrop(id) {
      if (cropId === id) return;
      cropId = id;
      if (id && !ids.includes(id)) ids = [id];
      emit();
    },

    prune(doc) {
      const next = ids.filter((id) => doc.elements[id]);
      const nextCrop = cropId && doc.elements[cropId] ? cropId : null;
      if (same(next, ids) && nextCrop === cropId) return;
      ids = next;
      cropId = nextCrop;
      emit();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
```

- [ ] **Step 8: Uruchom testy — mają przejść**

Run: `npx vitest run tests/core/history.test.js tests/core/store.test.js tests/core/selection.test.js`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/core/history.js src/core/store.js src/core/selection.js tests/core/history.test.js tests/core/store.test.js tests/core/selection.test.js
git commit -m "feat(core): historia cofania ze scalaniem, store i zaznaczenie"
```

---
### Task 6: Układy plakatu (`core/layouts.js`)

**Files:**
- Create: `src/core/layouts.js`
- Test: `tests/core/layouts.test.js`

**Interfaces:**
- Consumes: `ORIENTATIONS` z `constants.js`.
- Produces:
  - `LAYOUT_ROLES = ['photo', 'panel', 'accent', 'title', 'subtitle', 'points', 'qr', 'footer']`
  - `LAYOUTS: { [id]: { name, landscape: Spec, portrait: Spec, props?: { [role]: object }, bottom?: role[] } }` — `bottom`: role ułożone na spodzie (domyślnie `['photo', 'panel']`) — identyfikatory: `split-left`, `split-right`, `full-photo`, `card`, `sidebar`, `photo-top`
  - `layoutMargin(format): number` — 6% krótszego boku
  - `computeLayout(layoutId, format, orientation): { [role]: Box }` — każda rola dostaje ramkę; rola nieużyta w układzie ma `hidden: true`
  - `applyBottomOrder(doc, layoutId = doc.layoutId): doc` — przenosi role z `bottom` na spód kolejności warstw
  - `layoutPhotoHint(layoutId): object | null` — wymuszony styl zdjęcia (np. `{ shape: 'circle' }`)
  - `applyLayout(doc, layoutId, orientations = ORIENTATIONS): doc` — ustawia ramki elementów z rolą, dodaje ramki elementom `free` bez ramki, stosuje `props` (wyrównanie tekstu, styl zdjęcia), przenosi role z `bottom` na spód kolejności warstw, ustawia `doc.layoutId` (nieznany id → `split-left`)

Spec układu: rola → `[x, y, w, h]` jako ułamki **obszaru treści** (płótno minus margines) albo `B(x, y, w, h)` — ułamki **całego płótna** (zdjęcie „na spad”).

- [ ] **Step 1: Napisz testy**

`tests/core/layouts.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { LAYOUTS, LAYOUT_ROLES, computeLayout, applyLayout, layoutMargin, layoutPhotoHint } from '../../src/core/layouts.js';
import { FORMAT_PRESETS, ORIENTATIONS } from '../../src/core/constants.js';
import { createBaseDocument, createElement } from '../../src/core/model.js';

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const TEXT_ROLES = ['accent', 'title', 'subtitle', 'points', 'qr', 'footer'];

describe('layoutMargin', () => {
  it('to 6% krótszego boku', () => {
    expect(layoutMargin({ w: 1920, h: 1080 })).toBe(65);
    expect(layoutMargin({ w: 1080, h: 1920 })).toBe(65);
  });
});

describe('computeLayout', () => {
  for (const id of Object.keys(LAYOUTS)) {
    for (const preset of FORMAT_PRESETS) {
      for (const o of ORIENTATIONS) {
        const format = preset[o];
        const boxes = computeLayout(id, format, o);

        it(`${id} / ${preset.id} / ${o}: wszystkie role, ramki w granicach płótna`, () => {
          expect(Object.keys(boxes).sort()).toEqual([...LAYOUT_ROLES].sort());
          for (const [role, b] of Object.entries(boxes)) {
            expect(b.w, role).toBeGreaterThan(0);
            expect(b.h, role).toBeGreaterThan(0);
            if (b.hidden) continue;
            expect(b.x, role).toBeGreaterThanOrEqual(0);
            expect(b.y, role).toBeGreaterThanOrEqual(0);
            expect(b.x + b.w, role).toBeLessThanOrEqual(format.w + 1);
            expect(b.y + b.h, role).toBeLessThanOrEqual(format.h + 1);
          }
        });

        it(`${id} / ${preset.id} / ${o}: teksty, QR i zdjęcie nie nachodzą na siebie`, () => {
          const roles = id === 'full-photo' ? TEXT_ROLES : [...TEXT_ROLES, 'photo'];
          const visible = roles.filter((r) => !boxes[r].hidden);
          for (let i = 0; i < visible.length; i++) {
            for (let j = i + 1; j < visible.length; j++) {
              expect(overlaps(boxes[visible[i]], boxes[visible[j]]), `${visible[i]} × ${visible[j]}`).toBe(false);
            }
          }
        });
      }
    }
  }

  it('nieznany układ → split-left', () => {
    const f = { w: 1920, h: 1080 };
    expect(computeLayout('nie-ma', f, 'landscape')).toEqual(computeLayout('split-left', f, 'landscape'));
  });

  it('zdjęcie na spad zaczyna się w rogu płótna', () => {
    const b = computeLayout('full-photo', { w: 1920, h: 1080 }, 'landscape').photo;
    expect(b).toEqual({ x: 0, y: 0, w: 1920, h: 1080, rotation: 0, hidden: false });
  });
});

describe('applyLayout', () => {
  it('ustawia ramki ról w obu orientacjach i ukrywa nieużyte', () => {
    const doc = applyLayout(createBaseDocument(), 'split-left');
    for (const o of ORIENTATIONS) {
      for (const id of doc.order) expect(doc.boxes[o][id], `${o}/${id}`).toBeTruthy();
    }
    const panel = Object.values(doc.elements).find((e) => e.role === 'panel');
    expect(doc.boxes.landscape[panel.id].hidden).toBe(true);
    expect(doc.layoutId).toBe('split-left');
  });

  it('daje ramkę elementom "free" bez ruszania istniejących', () => {
    const doc = createBaseDocument();
    const a = createElement('text', 'free');
    const b = createElement('shape', 'free');
    doc.elements[a.id] = a;
    doc.elements[b.id] = b;
    doc.order.push(a.id, b.id);
    doc.boxes.landscape[b.id] = { x: 1, y: 2, w: 30, h: 40, rotation: 5, hidden: false };
    applyLayout(doc, 'card');
    expect(doc.boxes.landscape[a.id]).toBeTruthy();
    expect(doc.boxes.portrait[a.id]).toBeTruthy();
    expect(doc.boxes.landscape[b.id]).toEqual({ x: 1, y: 2, w: 30, h: 40, rotation: 5, hidden: false });
  });

  it('stosuje właściwości układu', () => {
    const doc = applyLayout(createBaseDocument(), 'card');
    const title = Object.values(doc.elements).find((e) => e.role === 'title');
    const photo = Object.values(doc.elements).find((e) => e.role === 'photo');
    expect(title.align).toBe('center');
    expect(photo.shape).toBe('circle');
    applyLayout(doc, 'split-left');
    expect(title.align === 'center').toBe(false);
    expect(doc.elements[title.id].align).toBe('left');
  });

  it('układa panel karty pod zdjęciem, a w innych układach zdjęcie pod panelem', () => {
    const roleAt = (doc, i) => doc.elements[doc.order[i]].role;
    const doc = applyLayout(createBaseDocument(), 'card');
    expect([roleAt(doc, 0), roleAt(doc, 1)]).toEqual(['panel', 'photo']);
    applyLayout(doc, 'full-photo');
    expect([roleAt(doc, 0), roleAt(doc, 1)]).toEqual(['photo', 'panel']);
    expect(doc.order).toHaveLength(Object.keys(doc.elements).length);
  });

  it('może zmienić tylko jedną orientację', () => {
    const doc = applyLayout(createBaseDocument(), 'split-left');
    const before = structuredClone(doc.boxes.portrait);
    applyLayout(doc, 'photo-top', ['landscape']);
    expect(doc.boxes.portrait).toEqual(before);
  });

  it('layoutPhotoHint', () => {
    expect(layoutPhotoHint('card')).toEqual({ shape: 'circle' });
    expect(layoutPhotoHint('split-left')).toBeNull();
    expect(layoutPhotoHint('full-photo')).toMatchObject({ shape: 'rect', shadow: false });
  });
});
```

- [ ] **Step 2: Uruchom testy — mają nie przejść**

Run: `npx vitest run tests/core/layouts.test.js`
Expected: FAIL — brak `layouts.js`.

- [ ] **Step 3: Zaimplementuj `src/core/layouts.js`**

```js
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
```

- [ ] **Step 4: Uruchom testy — mają przejść**

Run: `npx vitest run tests/core/layouts.test.js`
Expected: PASS (6 układów × 4 formaty × 2 orientacje × 2 testy + 7 pozostałych).

- [ ] **Step 5: Commit**

```bash
git add src/core/layouts.js tests/core/layouts.test.js
git commit -m "feat(core): 6 układów plakatu dla poziomu i pionu"
```

---

### Task 7: Motywy, czcionki i fabryka dokumentu

**Files:**
- Create: `src/core/fonts.js`, `src/core/themes.js`, `src/core/document.js`
- Test: `tests/core/fonts.test.js`, `tests/core/themes.test.js`, `tests/core/document.test.js`

**Interfaces:**
- Consumes: `contrastRatio` (colors), `createBaseDocument`, `ELEMENT_DEFAULTS` (model), `applyLayout`, `computeLayout`, `layoutPhotoHint`, `LAYOUTS` (layouts), stałe.
- Produces:
  - `fonts.js`: `BUNDLED_FONTS: { family, category, bold, italic }[]` (14 pozycji), `SYSTEM_FONTS: string[]`, `FONT_SAMPLE`, `fontStyleString({ bold, italic }): 'normal'|'bold'|'italic'|'italic bold'`, `cssFontSpec(family, { bold, italic }, size = 40): string`, `allFontFamilies(): string[]`
  - `themes.js`: `THEMES` (10), `getTheme(id)`, `themePhotoProps(theme)`, `applyTheme(doc, theme): doc`
  - `document.js`: `STARTERS`, `newDocument({ themeId, layoutId, formatId, orientation, custom })`, `chooseLayout(doc, layoutId)`, `setFormat(doc, formatId, custom?)`, `findByRole(doc, role): element | null`, `restoreRole(doc, role): string` (id)

- [ ] **Step 1: Napisz testy czcionek**

`tests/core/fonts.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { BUNDLED_FONTS, SYSTEM_FONTS, fontStyleString, cssFontSpec, allFontFamilies } from '../../src/core/fonts.js';

describe('fonts', () => {
  it('ma 14 wbudowanych czcionek o unikalnych nazwach', () => {
    expect(BUNDLED_FONTS).toHaveLength(14);
    expect(new Set(BUNDLED_FONTS.map((f) => f.family)).size).toBe(14);
  });
  it('fontStyleString', () => {
    expect(fontStyleString({})).toBe('normal');
    expect(fontStyleString({ bold: true })).toBe('bold');
    expect(fontStyleString({ italic: true })).toBe('italic');
    expect(fontStyleString({ bold: true, italic: true })).toBe('italic bold');
  });
  it('cssFontSpec', () => {
    expect(cssFontSpec('Playfair Display', { bold: true, italic: true }, 30)).toBe('italic 700 30px "Playfair Display"');
    expect(cssFontSpec('Inter', {})).toBe('400 40px "Inter"');
  });
  it('allFontFamilies łączy wbudowane i systemowe', () => {
    const all = allFontFamilies();
    expect(all).toContain('Inter');
    expect(all).toContain('Arial');
    expect(all).toHaveLength(BUNDLED_FONTS.length + SYSTEM_FONTS.length);
  });
});
```

- [ ] **Step 2: Napisz testy motywów**

`tests/core/themes.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { THEMES, getTheme, applyTheme } from '../../src/core/themes.js';
import { BUNDLED_FONTS } from '../../src/core/fonts.js';
import { contrastRatio } from '../../src/core/colors.js';
import { createBaseDocument } from '../../src/core/model.js';
import { PALETTE_KEYS, BACKGROUND_TYPES, PATTERNS, BULLETS, PHOTO_SHAPES, QR_MODULE_STYLES } from '../../src/core/constants.js';

const families = BUNDLED_FONTS.map((f) => f.family);

describe('THEMES', () => {
  it('10 motywów o unikalnych id', () => {
    expect(THEMES).toHaveLength(10);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(10);
  });
  for (const t of THEMES) {
    it(`${t.name}: poprawne dane i czytelne kolory`, () => {
      expect(Object.keys(t.palette).sort()).toEqual([...PALETTE_KEYS].sort());
      expect(contrastRatio(t.palette.text, t.palette.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.palette.accent, t.palette.bg)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(t.palette.muted, t.palette.bg)).toBeGreaterThanOrEqual(3);
      expect(families).toContain(t.fonts.heading);
      expect(families).toContain(t.fonts.body);
      expect(BACKGROUND_TYPES).toHaveProperty(t.background.type);
      if (t.background.pattern) expect(PATTERNS).toHaveProperty(t.background.pattern);
      expect(BULLETS).toHaveProperty(t.bullet);
      expect(PHOTO_SHAPES).toHaveProperty(t.photo.shape);
      expect(QR_MODULE_STYLES).toHaveProperty(t.qr.moduleStyle);
    });
  }
});

describe('applyTheme', () => {
  it('ustawia paletę, czcionki, tło i style elementów', () => {
    const doc = createBaseDocument();
    const ocean = getTheme('ocean');
    applyTheme(doc, ocean);
    expect(doc.palette).toEqual(ocean.palette);
    expect(doc.fonts).toEqual(ocean.fonts);
    expect(doc.background.type).toBe(ocean.background.type);
    expect(doc.themeId).toBe('ocean');
    const els = Object.values(doc.elements);
    expect(els.find((e) => e.type === 'points').bullet).toBe(ocean.bullet);
    expect(els.find((e) => e.type === 'qr').moduleStyle).toBe(ocean.qr.moduleStyle);
    expect(els.find((e) => e.role === 'photo').shape).toBe(ocean.photo.shape);
  });
  it('nie zmienia kształtu zdjęcia wymuszonego przez układ', () => {
    const doc = createBaseDocument();
    doc.layoutId = 'full-photo';
    const photo = Object.values(doc.elements).find((e) => e.role === 'photo');
    photo.shape = 'rect';
    applyTheme(doc, getTheme('ocean'));
    expect(photo.shape).toBe('rect');
  });
  it('nie kopiuje referencji palety motywu', () => {
    const doc = createBaseDocument();
    applyTheme(doc, getTheme('las'));
    doc.palette.bg = '#000000';
    expect(getTheme('las').palette.bg).not.toBe('#000000');
  });
  it('getTheme zwraca pierwszy motyw dla nieznanego id', () => {
    expect(getTheme('nie-ma')).toBe(THEMES[0]);
  });
});
```

- [ ] **Step 3: Napisz testy fabryki dokumentu**

`tests/core/document.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { newDocument, setFormat, chooseLayout, findByRole, restoreRole, STARTERS } from '../../src/core/document.js';
import { getTheme } from '../../src/core/themes.js';
import { LAYOUTS } from '../../src/core/layouts.js';
import { ORIENTATIONS } from '../../src/core/constants.js';

describe('newDocument', () => {
  it('tworzy kompletny dokument z motywem i układem', () => {
    const doc = newDocument({ themeId: 'las', layoutId: 'card', orientation: 'portrait' });
    expect(doc.themeId).toBe('las');
    expect(doc.layoutId).toBe('card');
    expect(doc.orientation).toBe('portrait');
    expect(doc.palette).toEqual(getTheme('las').palette);
    for (const o of ORIENTATIONS) for (const id of doc.order) expect(doc.boxes[o][id]).toBeTruthy();
  });
  it('STARTERS wskazują istniejące motywy i układy', () => {
    for (const s of STARTERS) {
      expect(getTheme(s.themeId).id).toBe(s.themeId);
      expect(LAYOUTS[s.layoutId]).toBeTruthy();
    }
  });
});

describe('setFormat', () => {
  it('skaluje ramki proporcjonalnie', () => {
    const doc = newDocument();
    const id = doc.order[0];
    doc.boxes.landscape[id] = { x: 960, y: 540, w: 192, h: 108, rotation: 0, hidden: false };
    setFormat(doc, '4:3');
    expect(doc.formatId).toBe('4:3');
    expect(doc.formats.landscape).toEqual({ w: 1600, h: 1200 });
    expect(doc.boxes.landscape[id]).toMatchObject({ x: 800, y: 600, w: 160, h: 120 });
  });
  it('własny rozmiar: poziom = dłuższy bok, pion = zamieniony, z ograniczeniem', () => {
    const doc = newDocument();
    setFormat(doc, 'custom', { w: 900, h: 99999 });
    expect(doc.formatId).toBe('custom');
    expect(doc.formats.landscape).toEqual({ w: 8000, h: 900 });
    expect(doc.formats.portrait).toEqual({ w: 900, h: 8000 });
  });
  it('nieznany format → 16:9', () => {
    const doc = newDocument();
    setFormat(doc, 'xyz');
    expect(doc.formatId).toBe('16:9');
  });
});

describe('chooseLayout', () => {
  it('przywraca styl zdjęcia z motywu po układzie z podpowiedzią', () => {
    const doc = newDocument({ themeId: 'nocny', layoutId: 'card' });
    const photo = findByRole(doc, 'photo');
    expect(photo.shape).toBe('circle');
    chooseLayout(doc, 'split-left');
    expect(findByRole(doc, 'photo').shape).toBe(getTheme('nocny').photo.shape);
  });
});

describe('findByRole / restoreRole', () => {
  it('odtwarza usunięty element z ramkami i miejscem w kolejności', () => {
    const doc = newDocument();
    const title = findByRole(doc, 'title');
    delete doc.elements[title.id];
    doc.order = doc.order.filter((id) => id !== title.id);
    for (const o of ORIENTATIONS) delete doc.boxes[o][title.id];
    expect(findByRole(doc, 'title')).toBeNull();
    const id = restoreRole(doc, 'title');
    expect(doc.elements[id].role).toBe('title');
    expect(doc.order).toContain(id);
    for (const o of ORIENTATIONS) expect(doc.boxes[o][id].hidden).toBe(false);
  });
  it('zdjęcie wraca na spód (a w karcie tuż nad panelem)', () => {
    const card = newDocument({ layoutId: 'card' });
    const cardPhoto = findByRole(card, 'photo');
    delete card.elements[cardPhoto.id];
    card.order = card.order.filter((id) => id !== cardPhoto.id);
    const restored = restoreRole(card, 'photo');
    expect(card.order[1]).toBe(restored);
    const doc = newDocument();
    const photo = findByRole(doc, 'photo');
    delete doc.elements[photo.id];
    doc.order = doc.order.filter((id) => id !== photo.id);
    const id = restoreRole(doc, 'photo');
    expect(doc.order[0]).toBe(id);
  });
  it('nie dubluje istniejącego elementu', () => {
    const doc = newDocument();
    const before = doc.order.length;
    expect(restoreRole(doc, 'qr')).toBe(findByRole(doc, 'qr').id);
    expect(doc.order).toHaveLength(before);
  });
});
```

- [ ] **Step 4: Uruchom testy — mają nie przejść**

Run: `npx vitest run tests/core/fonts.test.js tests/core/themes.test.js tests/core/document.test.js`
Expected: FAIL — brak modułów.

- [ ] **Step 5: Zaimplementuj `src/core/fonts.js`**

```js
export const BUNDLED_FONTS = [
  { family: 'Inter', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Montserrat', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Poppins', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Roboto', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Open Sans', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Lato', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Nunito', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Raleway', category: 'Bezszeryfowe', bold: true, italic: true },
  { family: 'Oswald', category: 'Nagłówkowe', bold: true, italic: false },
  { family: 'Bebas Neue', category: 'Nagłówkowe', bold: false, italic: false },
  { family: 'Playfair Display', category: 'Szeryfowe', bold: true, italic: true },
  { family: 'Merriweather', category: 'Szeryfowe', bold: true, italic: true },
  { family: 'Lora', category: 'Szeryfowe', bold: true, italic: true },
  { family: 'Caveat', category: 'Odręczne', bold: true, italic: false },
];

export const SYSTEM_FONTS = ['Arial', 'Segoe UI', 'Calibri', 'Georgia', 'Verdana', 'Impact', 'Times New Roman'];

export const FONT_SAMPLE = 'AaĄąĆćĘęŁłŃńÓóŚśŹźŻż0123';

export function fontStyleString({ bold = false, italic = false } = {}) {
  if (bold && italic) return 'italic bold';
  if (bold) return 'bold';
  if (italic) return 'italic';
  return 'normal';
}

export function cssFontSpec(family, { bold = false, italic = false } = {}, size = 40) {
  return `${italic ? 'italic ' : ''}${bold ? 700 : 400} ${size}px "${family}"`;
}

export function allFontFamilies() {
  return [...BUNDLED_FONTS.map((f) => f.family), ...SYSTEM_FONTS];
}
```

- [ ] **Step 6: Zaimplementuj `src/core/themes.js`**

```js
import { layoutPhotoHint } from './layouts.js';

export const THEMES = [
  {
    id: 'nocny', name: 'Nocny',
    palette: { bg: '#0f172a', bg2: '#1e293b', accent: '#38bdf8', text: '#f8fafc', muted: '#94a3b8' },
    fonts: { heading: 'Montserrat', body: 'Inter' },
    background: { type: 'linear', angle: 135 },
    bullet: 'dot', photo: { shape: 'rounded', borderWidth: 0 }, qr: { moduleStyle: 'rounded' },
  },
  {
    id: 'jasny', name: 'Jasny minimal',
    palette: { bg: '#ffffff', bg2: '#f1f5f9', accent: '#2563eb', text: '#0f172a', muted: '#475569' },
    fonts: { heading: 'Inter', body: 'Inter' },
    background: { type: 'solid' },
    bullet: 'check', photo: { shape: 'rect', borderWidth: 0 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'ocean', name: 'Ocean',
    palette: { bg: '#03396c', bg2: '#005b96', accent: '#6dd5ed', text: '#ffffff', muted: '#b3cde0' },
    fonts: { heading: 'Poppins', body: 'Nunito' },
    background: { type: 'radial' },
    bullet: 'arrow', photo: { shape: 'circle', borderWidth: 10 }, qr: { moduleStyle: 'dots' },
  },
  {
    id: 'zachod', name: 'Zachód słońca',
    palette: { bg: '#2d1b3d', bg2: '#c0392b', accent: '#ffb347', text: '#fff7ed', muted: '#fcd5b5' },
    fonts: { heading: 'Bebas Neue', body: 'Lato' },
    background: { type: 'linear', angle: 160 },
    bullet: 'star', photo: { shape: 'arch', borderWidth: 0 }, qr: { moduleStyle: 'rounded' },
  },
  {
    id: 'las', name: 'Las',
    palette: { bg: '#1b3a2b', bg2: '#2f5d46', accent: '#a3d977', text: '#f1f8e9', muted: '#c5e1a5' },
    fonts: { heading: 'Merriweather', body: 'Open Sans' },
    background: { type: 'pattern', pattern: 'diagonal' },
    bullet: 'check', photo: { shape: 'rounded', borderWidth: 8 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'neon', name: 'Neon',
    palette: { bg: '#0a0a0a', bg2: '#1a0033', accent: '#ff2bd6', text: '#ffffff', muted: '#00f0ff' },
    fonts: { heading: 'Oswald', body: 'Roboto' },
    background: { type: 'pattern', pattern: 'grid' },
    bullet: 'arrow', photo: { shape: 'hexagon', borderWidth: 6 }, qr: { moduleStyle: 'dots' },
  },
  {
    id: 'firmowy', name: 'Firmowy',
    palette: { bg: '#f8fafc', bg2: '#e2e8f0', accent: '#0f766e', text: '#1e293b', muted: '#64748b' },
    fonts: { heading: 'Raleway', body: 'Open Sans' },
    background: { type: 'solid' },
    bullet: 'dash', photo: { shape: 'rect', borderWidth: 0 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'pastel', name: 'Pastelowy',
    palette: { bg: '#fdf2f8', bg2: '#e0f2fe', accent: '#db2777', text: '#3b0764', muted: '#7e22ce' },
    fonts: { heading: 'Poppins', body: 'Nunito' },
    background: { type: 'pattern', pattern: 'dots' },
    bullet: 'dot', photo: { shape: 'circle', borderWidth: 12 }, qr: { moduleStyle: 'rounded' },
  },
  {
    id: 'elegancki', name: 'Elegancki',
    palette: { bg: '#111111', bg2: '#2b2b2b', accent: '#d4af37', text: '#f5f5f0', muted: '#bdb6a3' },
    fonts: { heading: 'Playfair Display', body: 'Lora' },
    background: { type: 'radial' },
    bullet: 'dash', photo: { shape: 'arch', borderWidth: 4 }, qr: { moduleStyle: 'square' },
  },
  {
    id: 'odreczny', name: 'Odręczny',
    palette: { bg: '#fffbeb', bg2: '#fef3c7', accent: '#ea580c', text: '#292524', muted: '#78716c' },
    fonts: { heading: 'Caveat', body: 'Nunito' },
    background: { type: 'pattern', pattern: 'waves' },
    bullet: 'star', photo: { shape: 'rounded', borderWidth: 14 }, qr: { moduleStyle: 'rounded' },
  },
];

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function themePhotoProps(theme) {
  return { shape: theme.photo.shape, borderWidth: theme.photo.borderWidth, shadow: true };
}

export function applyTheme(doc, theme) {
  doc.palette = { ...theme.palette };
  doc.fonts = { ...theme.fonts };
  doc.background.type = theme.background.type;
  if (theme.background.angle !== undefined) doc.background.angle = theme.background.angle;
  if (theme.background.pattern) doc.background.pattern = theme.background.pattern;
  const keepPhoto = layoutPhotoHint(doc.layoutId) !== null;
  for (const el of Object.values(doc.elements)) {
    if (el.type === 'points') el.bullet = theme.bullet;
    if (el.type === 'qr') el.moduleStyle = theme.qr.moduleStyle;
    if (el.role === 'photo' && !keepPhoto) Object.assign(el, themePhotoProps(theme));
  }
  doc.themeId = theme.id;
  return doc;
}
```

Uwaga: jeśli motyw ma tło `image`, a dokument nie ma obrazu, renderer narysuje tło jednolite (Zadanie 11). Żaden wbudowany motyw nie używa `image`.

- [ ] **Step 7: Zaimplementuj `src/core/document.js`**

```js
import { FORMAT_PRESETS, ORIENTATIONS, MIN_FORMAT, MAX_FORMAT, MIN_BOX } from './constants.js';
import { createBaseDocument } from './model.js';
import { applyLayout, applyBottomOrder, computeLayout, layoutPhotoHint } from './layouts.js';
import { applyTheme, getTheme, themePhotoProps } from './themes.js';

export const STARTERS = [
  { id: 'start-nocny', name: 'Nocny — zdjęcie z lewej', themeId: 'nocny', layoutId: 'split-left' },
  { id: 'start-jasny', name: 'Jasny — zdjęcie z prawej', themeId: 'jasny', layoutId: 'split-right' },
  { id: 'start-ocean', name: 'Ocean — karta', themeId: 'ocean', layoutId: 'card' },
  { id: 'start-zachod', name: 'Zachód — zdjęcie w tle', themeId: 'zachod', layoutId: 'full-photo' },
  { id: 'start-las', name: 'Las — pół na pół', themeId: 'las', layoutId: 'sidebar' },
  { id: 'start-neon', name: 'Neon — baner', themeId: 'neon', layoutId: 'photo-top' },
  { id: 'start-firmowy', name: 'Firmowy — zdjęcie z lewej', themeId: 'firmowy', layoutId: 'split-left' },
  { id: 'start-elegancki', name: 'Elegancki — karta', themeId: 'elegancki', layoutId: 'card' },
];

export function setFormat(doc, formatId, custom = null) {
  let next;
  let id = formatId;
  if (formatId === 'custom') {
    const clamp = (v) => Math.min(MAX_FORMAT, Math.max(MIN_FORMAT, Math.round(Number(v) || 0)));
    const a = clamp(custom?.w ?? 1920);
    const b = clamp(custom?.h ?? 1080);
    next = {
      landscape: { w: Math.max(a, b), h: Math.min(a, b) },
      portrait: { w: Math.min(a, b), h: Math.max(a, b) },
    };
  } else {
    const preset = FORMAT_PRESETS.find((p) => p.id === formatId) ?? FORMAT_PRESETS[0];
    next = { landscape: { ...preset.landscape }, portrait: { ...preset.portrait } };
    id = preset.id;
  }
  for (const o of ORIENTATIONS) {
    const old = doc.formats[o];
    const sx = next[o].w / old.w;
    const sy = next[o].h / old.h;
    for (const b of Object.values(doc.boxes[o])) {
      b.x = Math.round(b.x * sx);
      b.y = Math.round(b.y * sy);
      b.w = Math.max(MIN_BOX, Math.round(b.w * sx));
      b.h = Math.max(MIN_BOX, Math.round(b.h * sy));
    }
    doc.formats[o] = next[o];
  }
  doc.formatId = id;
  return doc;
}

function photoStyleFor(doc) {
  return layoutPhotoHint(doc.layoutId) ?? themePhotoProps(getTheme(doc.themeId));
}

export function chooseLayout(doc, layoutId) {
  applyLayout(doc, layoutId);
  const style = photoStyleFor(doc);
  for (const el of Object.values(doc.elements)) if (el.role === 'photo') Object.assign(el, style);
  return doc;
}

export function newDocument({ themeId = 'nocny', layoutId = 'split-left', formatId = '16:9', orientation = 'landscape', custom = null } = {}) {
  const doc = createBaseDocument();
  setFormat(doc, formatId, custom);
  doc.orientation = orientation === 'portrait' ? 'portrait' : 'landscape';
  doc.layoutId = layoutId;
  applyTheme(doc, getTheme(themeId));
  chooseLayout(doc, layoutId);
  return doc;
}

export function findByRole(doc, role) {
  for (const id of doc.order) if (doc.elements[id]?.role === role) return doc.elements[id];
  return null;
}

export function restoreRole(doc, role) {
  const existing = findByRole(doc, role);
  if (existing) return existing.id;
  const template = Object.values(createBaseDocument().elements).find((e) => e.role === role);
  if (!template) throw new Error(`Nie można odtworzyć roli: ${role}`);
  const el = structuredClone(template);
  if (role === 'photo') Object.assign(el, photoStyleFor(doc));
  if (role === 'points') el.bullet = getTheme(doc.themeId).bullet;
  if (role === 'qr') el.moduleStyle = getTheme(doc.themeId).qr.moduleStyle;
  doc.elements[el.id] = el;
  doc.order.push(el.id);
  applyBottomOrder(doc);
  for (const o of ORIENTATIONS) {
    const b = computeLayout(doc.layoutId, doc.formats[o], o)[role];
    doc.boxes[o][el.id] = { ...b, hidden: false };
  }
  return el.id;
}
```

- [ ] **Step 8: Uruchom testy — mają przejść**

Run: `npx vitest run tests/core`
Expected: PASS (wszystkie dotychczasowe testy).

- [ ] **Step 9: Commit**

```bash
git add src/core/fonts.js src/core/themes.js src/core/document.js tests/core/fonts.test.js tests/core/themes.test.js tests/core/document.test.js
git commit -m "feat(core): 10 motywów, lista czcionek i fabryka dokumentu"
```

---
### Task 8: Operacje na elementach i wyrównywanie

**Files:**
- Create: `src/core/elementOps.js`, `src/core/align.js`
- Test: `tests/core/elementOps.test.js`, `tests/core/align.test.js`

**Interfaces:**
- Consumes: `createElement`, `TYPE_NAMES` (model), `newId` (ids), `ORIENTATIONS`, `MIN_BOX` (constants).
- Produces (wszystkie funkcje mutują przekazany `doc` — wywoływane wewnątrz `store.update`):
  - `addElement(doc, type, { overrides = {}, at = null } = {}): string` — nowy element `role: 'free'` z ramkami w obu orientacjach; `at = { x, y }` centruje ramkę bieżącej orientacji w punkcie
  - `duplicateElements(doc, ids, offset = 24): string[]` — kopie (`role: 'free'`) tuż nad oryginałami
  - `deleteElements(doc, ids): number`
  - `reorder(doc, ids, mode: 'front'|'forward'|'backward'|'back'): boolean`
  - `nudge(doc, ids, dx, dy, orientation = doc.orientation): boolean` — pomija zablokowane
  - `setBox(doc, id, patch, orientation = doc.orientation): void`
  - `toggleHidden(doc, ids, orientation = doc.orientation): void` — jeśli którykolwiek widoczny → ukryj wszystkie, inaczej pokaż
  - `setLocked(doc, ids, locked: boolean): void`
  - `renameElement(doc, id, name): boolean`
  - `align.js`: `unionBox(boxes)`, `alignBoxes(boxes, mode, bounds = null): { id, x, y }[]` (`mode`: `left|hcenter|right|top|vcenter|bottom`), `distributeBoxes(boxes, axis: 'h'|'v'): { id, x, y }[]`

- [ ] **Step 1: Napisz testy operacji**

`tests/core/elementOps.test.js`:
```js
import { describe, it, expect } from 'vitest';
import {
  addElement, duplicateElements, deleteElements, reorder, nudge, setBox, toggleHidden, setLocked, renameElement,
} from '../../src/core/elementOps.js';
import { newDocument } from '../../src/core/document.js';
import { MIN_BOX } from '../../src/core/constants.js';

const fresh = () => newDocument();

describe('addElement', () => {
  it('dodaje element na wierzch z ramkami w obu orientacjach', () => {
    const doc = fresh();
    const id = addElement(doc, 'text', { overrides: { text: 'Nowy' } });
    expect(doc.order.at(-1)).toBe(id);
    expect(doc.elements[id]).toMatchObject({ type: 'text', role: 'free', text: 'Nowy', name: 'Tekst' });
    expect(doc.boxes.landscape[id]).toMatchObject({ x: 576, w: 768 });
    expect(doc.boxes.portrait[id]).toBeTruthy();
  });
  it('nadaje unikalne nazwy i centruje w punkcie', () => {
    const doc = fresh();
    addElement(doc, 'shape');
    const id = addElement(doc, 'shape', { at: { x: 100, y: 100 } });
    expect(doc.elements[id].name).toBe('Kształt 2');
    const b = doc.boxes.landscape[id];
    expect(b.x + b.w / 2).toBe(100);
    expect(b.y + b.h / 2).toBe(100);
  });
  it('obrazy i kształty są kwadratowe, linia jest cienka', () => {
    const doc = fresh();
    const img = addElement(doc, 'image');
    expect(doc.boxes.landscape[img].w).toBe(doc.boxes.landscape[img].h);
    const line = addElement(doc, 'shape', { overrides: { shape: 'line' } });
    expect(doc.boxes.landscape[line].h).toBe(24);
  });
});

describe('duplicateElements / deleteElements', () => {
  it('kopiuje tuż nad oryginałem z przesunięciem', () => {
    const doc = fresh();
    const src = doc.order[3];
    const [copy] = duplicateElements(doc, [src]);
    expect(doc.order.indexOf(copy)).toBe(doc.order.indexOf(src) + 1);
    expect(doc.elements[copy].role).toBe('free');
    expect(doc.elements[copy].name).toBe(`${doc.elements[src].name} (kopia)`);
    expect(doc.boxes.landscape[copy].x).toBe(doc.boxes.landscape[src].x + 24);
    doc.elements[copy].text = 'zmieniony';
    expect(doc.elements[src].text).not.toBe('zmieniony');
  });
  it('usuwa elementy, kolejność i ramki', () => {
    const doc = fresh();
    const ids = doc.order.slice(0, 2);
    expect(deleteElements(doc, ids)).toBe(2);
    for (const id of ids) {
      expect(doc.elements[id]).toBeUndefined();
      expect(doc.order).not.toContain(id);
      expect(doc.boxes.landscape[id]).toBeUndefined();
      expect(doc.boxes.portrait[id]).toBeUndefined();
    }
  });
});

describe('reorder', () => {
  const doc4 = () => ({ order: ['a', 'b', 'c', 'd'] });
  it('na wierzch / na spód', () => {
    const d = doc4();
    reorder(d, ['a', 'c'], 'front');
    expect(d.order).toEqual(['b', 'd', 'a', 'c']);
    reorder(d, ['c'], 'back');
    expect(d.order).toEqual(['c', 'b', 'd', 'a']);
  });
  it('o jedną warstwę', () => {
    const d = doc4();
    expect(reorder(d, ['a', 'b'], 'forward')).toBe(true);
    expect(d.order).toEqual(['c', 'a', 'b', 'd']);
    reorder(d, ['b'], 'backward');
    expect(d.order).toEqual(['c', 'b', 'a', 'd']);
  });
  it('zwraca false, gdy nic się nie zmienia', () => {
    const d = doc4();
    expect(reorder(d, ['d'], 'front')).toBe(false);
  });
});

describe('nudge / setBox', () => {
  it('przesuwa niezablokowane', () => {
    const doc = fresh();
    const [a, b] = doc.order;
    doc.elements[b].locked = true;
    const ax = doc.boxes.landscape[a].x;
    const bx = doc.boxes.landscape[b].x;
    expect(nudge(doc, [a, b], 10, -5)).toBe(true);
    expect(doc.boxes.landscape[a].x).toBe(ax + 10);
    expect(doc.boxes.landscape[b].x).toBe(bx);
  });
  it('setBox pilnuje minimum i liczb', () => {
    const doc = fresh();
    const id = doc.order[0];
    setBox(doc, id, { w: 1, h: NaN, x: 12.6 });
    expect(doc.boxes.landscape[id]).toMatchObject({ w: MIN_BOX, x: 12.6 });
    expect(Number.isFinite(doc.boxes.landscape[id].h)).toBe(true);
  });
});

describe('toggleHidden / setLocked / renameElement', () => {
  it('ukrywa wszystkie, jeśli któryś widoczny', () => {
    const doc = fresh();
    const ids = [doc.order[0], doc.order[3]]; // zdjęcie i tytuł (oba widoczne w układzie split-left)
    doc.boxes.landscape[ids[0]].hidden = true;
    toggleHidden(doc, ids);
    expect(ids.every((id) => doc.boxes.landscape[id].hidden)).toBe(true);
    toggleHidden(doc, ids);
    expect(ids.every((id) => !doc.boxes.landscape[id].hidden)).toBe(true);
    expect(doc.boxes.portrait[ids[0]].hidden).toBe(false);
  });
  it('blokuje i zmienia nazwę', () => {
    const doc = fresh();
    const id = doc.order[0];
    setLocked(doc, [id], true);
    expect(doc.elements[id].locked).toBe(true);
    expect(renameElement(doc, id, '  Moje zdjęcie  ')).toBe(true);
    expect(doc.elements[id].name).toBe('Moje zdjęcie');
    expect(renameElement(doc, id, '   ')).toBe(false);
  });
});
```

- [ ] **Step 2: Napisz testy wyrównywania**

`tests/core/align.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { unionBox, alignBoxes, distributeBoxes } from '../../src/core/align.js';

const boxes = [
  { id: 'a', x: 10, y: 10, w: 100, h: 50 },
  { id: 'b', x: 200, y: 100, w: 40, h: 40 },
];

describe('unionBox', () => {
  it('obejmuje wszystkie ramki', () => {
    expect(unionBox(boxes)).toEqual({ x: 10, y: 10, w: 230, h: 130 });
  });
});

describe('alignBoxes', () => {
  it('do lewej / prawej / środka względem sumy', () => {
    expect(alignBoxes(boxes, 'left')).toEqual([{ id: 'a', x: 10, y: 10 }, { id: 'b', x: 10, y: 100 }]);
    expect(alignBoxes(boxes, 'right')).toEqual([{ id: 'a', x: 140, y: 10 }, { id: 'b', x: 200, y: 100 }]);
    expect(alignBoxes(boxes, 'vcenter')).toEqual([{ id: 'a', x: 10, y: 50 }, { id: 'b', x: 200, y: 55 }]);
  });
  it('względem płótna', () => {
    const out = alignBoxes([boxes[0]], 'hcenter', { x: 0, y: 0, w: 1920, h: 1080 });
    expect(out).toEqual([{ id: 'a', x: 910, y: 10 }]);
    expect(alignBoxes([boxes[0]], 'bottom', { x: 0, y: 0, w: 1920, h: 1080 })[0].y).toBe(1030);
  });
});

describe('distributeBoxes', () => {
  it('równe odstępy w poziomie', () => {
    const out = distributeBoxes([
      { id: 'a', x: 0, y: 0, w: 10, h: 10 },
      { id: 'c', x: 90, y: 0, w: 10, h: 10 },
      { id: 'b', x: 20, y: 0, w: 10, h: 10 },
    ], 'h');
    expect(out.find((b) => b.id === 'b').x).toBe(45);
    expect(out.find((b) => b.id === 'a').x).toBe(0);
    expect(out.find((b) => b.id === 'c').x).toBe(90);
  });
  it('mniej niż 3 elementy — bez zmian', () => {
    expect(distributeBoxes(boxes, 'v')).toEqual([{ id: 'a', x: 10, y: 10 }, { id: 'b', x: 200, y: 100 }]);
  });
});
```

- [ ] **Step 3: Uruchom testy — mają nie przejść**

Run: `npx vitest run tests/core/elementOps.test.js tests/core/align.test.js`
Expected: FAIL — brak modułów.

- [ ] **Step 4: Zaimplementuj `src/core/elementOps.js`**

```js
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
```

- [ ] **Step 5: Zaimplementuj `src/core/align.js`**

```js
export function unionBox(boxes) {
  const x1 = Math.min(...boxes.map((b) => b.x));
  const y1 = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.w));
  const y2 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function alignBoxes(boxes, mode, bounds = null) {
  const ref = bounds ?? unionBox(boxes);
  return boxes.map((b) => {
    let { x, y } = b;
    if (mode === 'left') x = ref.x;
    if (mode === 'hcenter') x = ref.x + (ref.w - b.w) / 2;
    if (mode === 'right') x = ref.x + ref.w - b.w;
    if (mode === 'top') y = ref.y;
    if (mode === 'vcenter') y = ref.y + (ref.h - b.h) / 2;
    if (mode === 'bottom') y = ref.y + ref.h - b.h;
    return { id: b.id, x: Math.round(x), y: Math.round(y) };
  });
}

export function distributeBoxes(boxes, axis) {
  if (boxes.length < 3) return boxes.map((b) => ({ id: b.id, x: b.x, y: b.y }));
  const pos = axis === 'h' ? 'x' : 'y';
  const size = axis === 'h' ? 'w' : 'h';
  const sorted = [...boxes].sort((a, b) => a[pos] - b[pos]);
  const first = sorted[0];
  const last = sorted.at(-1);
  const span = last[pos] + last[size] - first[pos];
  const sum = sorted.reduce((acc, b) => acc + b[size], 0);
  const gap = (span - sum) / (sorted.length - 1);
  let cursor = first[pos];
  const placed = new Map();
  for (const b of sorted) {
    placed.set(b.id, Math.round(cursor));
    cursor += b[size] + gap;
  }
  return boxes.map((b) => ({ id: b.id, x: pos === 'x' ? placed.get(b.id) : b.x, y: pos === 'y' ? placed.get(b.id) : b.y }));
}
```

- [ ] **Step 6: Uruchom testy — mają przejść**

Run: `npx vitest run tests/core/elementOps.test.js tests/core/align.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/elementOps.js src/core/align.js tests/core/elementOps.test.js tests/core/align.test.js
git commit -m "feat(core): operacje na elementach, warstwy, wyrównywanie i rozkładanie"
```

---
### Task 9: Przyciąganie i dopasowanie tekstu

**Files:**
- Create: `src/core/snapping.js`, `src/core/textfit.js`
- Test: `tests/core/snapping.test.js`, `tests/core/textfit.test.js`

**Interfaces:**
- Consumes: `SAFE_AREA` z `constants.js`.
- Produces:
  - `snapTargets(boxes: Box[], format, { safeArea = SAFE_AREA } = {}): { xs: number[], ys: number[] }`
  - `computeSnap(box, targets, threshold): { dx, dy, guideX: number|null, guideY: number|null }`
  - `fitFontSize(measure: (size) => { width, height }, { maxSize, minSize = 8, boxWidth = Infinity, boxHeight }): number`
  - `layoutPoints(heights: number[], { gap, boxHeight = 0, distribute = 'top' }): { ys: number[], total: number }`
  - `fitPoints(measureItem: (index, size) => height, count, { maxSize, minSize = 8, spacing, boxHeight }): number`

- [ ] **Step 1: Napisz testy przyciągania**

`tests/core/snapping.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { snapTargets, computeSnap } from '../../src/core/snapping.js';

const format = { w: 1000, h: 500 };

describe('snapTargets', () => {
  it('zawiera krawędzie, środek, obszar bezpieczny i ramki innych', () => {
    const t = snapTargets([{ x: 100, y: 50, w: 200, h: 100 }], format, { safeArea: 0.1 });
    expect(t.xs).toEqual(expect.arrayContaining([0, 500, 1000, 100, 900, 200, 300]));
    expect(t.ys).toEqual(expect.arrayContaining([0, 250, 500, 50, 450, 100, 150]));
  });
});

describe('computeSnap', () => {
  const targets = snapTargets([], format, { safeArea: 0 });
  it('przyciąga środek do środka płótna', () => {
    const r = computeSnap({ x: 446, y: 20, w: 100, h: 40 }, targets, 6);
    expect(r.dx).toBe(4);
    expect(r.guideX).toBe(500);
  });
  it('nie przyciąga poza progiem', () => {
    const r = computeSnap({ x: 430, y: 100, w: 100, h: 40 }, targets, 6);
    expect(r).toEqual({ dx: 0, dy: 0, guideX: null, guideY: null });
  });
  it('wybiera najbliższy cel', () => {
    const t = { xs: [100, 103], ys: [] };
    const r = computeSnap({ x: 104, y: 0, w: 10, h: 10 }, t, 6);
    expect(r.dx).toBe(-1);
    expect(r.guideX).toBe(103);
  });
  it('przyciąga prawą krawędź i dolną krawędź', () => {
    const r = computeSnap({ x: 897, y: 458, w: 100, h: 40 }, targets, 6);
    expect(r.dx).toBe(3);
    expect(r.dy).toBe(2);
    expect(r.guideX).toBe(1000);
    expect(r.guideY).toBe(500);
  });
});
```

- [ ] **Step 2: Napisz testy dopasowania tekstu**

`tests/core/textfit.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { fitFontSize, layoutPoints, fitPoints } from '../../src/core/textfit.js';

describe('fitFontSize', () => {
  const measure = (s) => ({ width: 100, height: s * 2 });
  it('zwraca maksimum, gdy mieści się', () => {
    expect(fitFontSize(measure, { maxSize: 20, boxHeight: 50 })).toBe(20);
  });
  it('zmniejsza do największego pasującego', () => {
    expect(fitFontSize(measure, { maxSize: 100, boxHeight: 50 })).toBe(25);
  });
  it('nie schodzi poniżej minimum', () => {
    expect(fitFontSize(measure, { maxSize: 100, minSize: 8, boxHeight: 4 })).toBe(8);
  });
  it('bierze pod uwagę szerokość', () => {
    const m = (s) => ({ width: s * 10, height: s });
    expect(fitFontSize(m, { maxSize: 100, boxWidth: 300, boxHeight: 1000 })).toBe(30);
  });
  it('symulacja zawijania: więcej linii przy większym rozmiarze', () => {
    const wrap = (s) => {
      const lines = Math.ceil((40 * s * 0.5) / 400);
      return { width: 400, height: lines * s * 1.2 };
    };
    const size = fitFontSize(wrap, { maxSize: 120, boxHeight: 150 });
    expect(wrap(size).height).toBeLessThanOrEqual(150.5);
    expect(wrap(size + 1).height).toBeGreaterThan(150);
  });
});

describe('layoutPoints', () => {
  it('od góry ze stałym odstępem', () => {
    expect(layoutPoints([10, 20, 10], { gap: 5 })).toEqual({ ys: [0, 15, 40], total: 50 });
  });
  it('rozkłada równomiernie na wysokość ramki', () => {
    expect(layoutPoints([10, 10, 10], { gap: 5, boxHeight: 90, distribute: 'spread' })).toEqual({ ys: [0, 40, 80], total: 90 });
  });
  it('spread nie ściska poniżej zwykłego odstępu', () => {
    expect(layoutPoints([10, 10], { gap: 5, boxHeight: 12, distribute: 'spread' }).ys).toEqual([0, 15]);
  });
  it('pusta lista', () => {
    expect(layoutPoints([], { gap: 5 })).toEqual({ ys: [], total: 0 });
  });
});

describe('fitPoints', () => {
  it('dobiera rozmiar tak, by wszystkie punkty i odstępy się zmieściły', () => {
    const measureItem = (_i, s) => s * 1.2;
    const size = fitPoints(measureItem, 4, { maxSize: 100, spacing: 0.5, boxHeight: 300 });
    const total = (s) => 4 * s * 1.2 + 3 * s * 0.5;
    expect(total(size)).toBeLessThanOrEqual(300.5);
    expect(total(size + 1)).toBeGreaterThan(300);
  });
});
```

- [ ] **Step 3: Uruchom testy — mają nie przejść**

Run: `npx vitest run tests/core/snapping.test.js tests/core/textfit.test.js`
Expected: FAIL — brak modułów.

- [ ] **Step 4: Zaimplementuj `src/core/snapping.js`**

```js
import { SAFE_AREA } from './constants.js';

export function snapTargets(boxes, format, { safeArea = SAFE_AREA } = {}) {
  const xs = [0, format.w / 2, format.w];
  const ys = [0, format.h / 2, format.h];
  if (safeArea > 0) {
    xs.push(format.w * safeArea, format.w * (1 - safeArea));
    ys.push(format.h * safeArea, format.h * (1 - safeArea));
  }
  for (const b of boxes) {
    xs.push(b.x, b.x + b.w / 2, b.x + b.w);
    ys.push(b.y, b.y + b.h / 2, b.y + b.h);
  }
  return { xs, ys };
}

function nearest(edges, targets, threshold) {
  let result = null;
  for (const e of edges) {
    for (const t of targets) {
      const delta = t - e;
      if (Math.abs(delta) <= threshold && (!result || Math.abs(delta) < Math.abs(result.delta))) {
        result = { delta, guide: t };
      }
    }
  }
  return result;
}

export function computeSnap(box, targets, threshold) {
  const x = nearest([box.x, box.x + box.w / 2, box.x + box.w], targets.xs, threshold);
  const y = nearest([box.y, box.y + box.h / 2, box.y + box.h], targets.ys, threshold);
  return { dx: x?.delta ?? 0, dy: y?.delta ?? 0, guideX: x?.guide ?? null, guideY: y?.guide ?? null };
}
```

- [ ] **Step 5: Zaimplementuj `src/core/textfit.js`**

```js
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
```

- [ ] **Step 6: Uruchom testy — mają przejść**

Run: `npx vitest run tests/core/snapping.test.js tests/core/textfit.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/snapping.js src/core/textfit.js tests/core/snapping.test.js tests/core/textfit.test.js
git commit -m "feat(core): przyciąganie do linii pomocniczych i auto-dopasowanie tekstu"
```

---

### Task 10: Kod QR, obrazy i rozmiary eksportu

**Files:**
- Create: `src/core/qr.js`, `src/core/image.js`, `src/core/exportSizes.js`
- Test: `tests/core/qr.test.js`, `tests/core/image.test.js`, `tests/core/exportSizes.test.js`

**Interfaces:**
- Consumes: pakiet `qrcode` (czysty JS, działa w Node), `IMAGE_MAX_SIDE`, `FILE_EXT`.
- Produces:
  - `qr.js`: `QR_KINDS: { [kind]: label }`, `QR_FIELDS: { [kind]: { key, label, type, placeholder?, options? }[] }`, `buildQrPayload(kind, data): string`, `qrValidationError(kind, data): string | null`, `qrMatrix(payload, ecl = 'M'): { size, isDark(row, col) } | null`
  - `image.js`: `downscaleSize(w, h, maxSide = IMAGE_MAX_SIDE)`, `coverRect(imgW, imgH, boxW, boxH, crop)`, `containRect(imgW, imgH, boxW, boxH)`, `panCrop(crop, dx, dy, imgW, imgH, boxW, boxH)`, `buildCssFilter(filters, imageMaxSide)`, `isImageFile(name)`, `isProjectFile(name)`, `IMAGE_EXTENSIONS`
  - `exportSizes.js`: `EXPORT_SCALES`, `exportDims(format, scale)`, `pdfPage(format, mode: 'screen'|'a4')`, `sanitizeFileName(name)`, `exportFileName(name, orientation, ext)`, `presentationScale(format, display)`

- [ ] **Step 1: Napisz testy QR**

`tests/core/qr.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { buildQrPayload, qrValidationError, qrMatrix, QR_KINDS, QR_FIELDS } from '../../src/core/qr.js';

describe('buildQrPayload', () => {
  it('link: dopisuje https://', () => {
    expect(buildQrPayload('url', { url: 'mojastrona.pl' })).toBe('https://mojastrona.pl');
    expect(buildQrPayload('url', { url: ' http://a.pl ' })).toBe('http://a.pl');
    expect(buildQrPayload('url', { url: 'mailto:x@y.pl' })).toBe('mailto:x@y.pl');
  });
  it('Wi-Fi z ucieczką znaków specjalnych', () => {
    expect(buildQrPayload('wifi', { ssid: 'Dom;1', password: 'a:b', security: 'WPA', hidden: 'false' }))
      .toBe('WIFI:T:WPA;S:Dom\\;1;P:a\\:b;;');
    expect(buildQrPayload('wifi', { ssid: 'Kawiarnia', security: 'nopass', hidden: 'true' }))
      .toBe('WIFI:T:nopass;S:Kawiarnia;H:true;;');
  });
  it('e-mail z tematem', () => {
    expect(buildQrPayload('email', { email: 'jan@firma.pl', subject: 'Cześć!', body: '' }))
      .toBe('mailto:jan@firma.pl?subject=Cze%C5%9B%C4%87!');
  });
  it('telefon', () => {
    expect(buildQrPayload('phone', { phone: '+48 600-100-200' })).toBe('tel:+48600100200');
  });
  it('wizytówka vCard', () => {
    const v = buildQrPayload('vcard', { firstName: 'Jan', lastName: 'Kowalski', org: 'Firma, S.A.', phone: '600100200', email: '', url: '' });
    expect(v).toBe(['BEGIN:VCARD', 'VERSION:3.0', 'N:Kowalski;Jan;;;', 'FN:Jan Kowalski', 'ORG:Firma\\, S.A.', 'TEL:600100200', 'END:VCARD'].join('\r\n'));
  });
  it('tekst', () => {
    expect(buildQrPayload('text', { text: 'Dzień dobry' })).toBe('Dzień dobry');
  });
});

describe('qrValidationError', () => {
  it('zgłasza brakujące dane', () => {
    expect(qrValidationError('url', { url: '' })).toMatch(/adres/);
    expect(qrValidationError('wifi', { ssid: '' })).toMatch(/sieci/);
    expect(qrValidationError('email', { email: 'zly' })).toMatch(/e-mail/);
    expect(qrValidationError('phone', { phone: 'abc' })).toMatch(/telefonu/);
    expect(qrValidationError('text', { text: 'x'.repeat(1500) })).toMatch(/Za dużo/);
  });
  it('akceptuje poprawne dane', () => {
    expect(qrValidationError('url', { url: 'a.pl' })).toBeNull();
    expect(qrValidationError('vcard', { firstName: 'Jan' })).toBeNull();
  });
});

describe('qrMatrix', () => {
  it('tworzy macierz z wzorem pozycjonującym w rogu', () => {
    const m = qrMatrix('https://example.com', 'M');
    expect(m.size).toBeGreaterThanOrEqual(21);
    expect(m.isDark(0, 0)).toBe(true);
    expect(m.isDark(1, 1)).toBe(false);
  });
  it('wyższa korekcja = większa lub równa macierz', () => {
    expect(qrMatrix('https://example.com', 'H').size).toBeGreaterThanOrEqual(qrMatrix('https://example.com', 'L').size);
  });
  it('pusta treść → null', () => {
    expect(qrMatrix('')).toBeNull();
  });
  it('każdy typ ma pola formularza', () => {
    for (const kind of Object.keys(QR_KINDS)) expect(QR_FIELDS[kind].length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Napisz testy obrazów**

`tests/core/image.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { downscaleSize, coverRect, containRect, panCrop, buildCssFilter, isImageFile, isProjectFile } from '../../src/core/image.js';

describe('downscaleSize', () => {
  it('nie zmienia małych', () => {
    expect(downscaleSize(800, 600, 3000)).toEqual({ w: 800, h: 600, scaled: false });
  });
  it('zmniejsza dłuższy bok do limitu', () => {
    expect(downscaleSize(6000, 4000, 3000)).toEqual({ w: 3000, h: 2000, scaled: true });
    expect(downscaleSize(1000, 5000, 3000)).toEqual({ w: 600, h: 3000, scaled: true });
  });
});

describe('coverRect / containRect', () => {
  it('cover wypełnia ramkę i centruje domyślnie', () => {
    expect(coverRect(400, 200, 100, 100)).toEqual({ x: -50, y: 0, width: 200, height: 100 });
  });
  it('cover z ogniskiem po lewej i zoomem', () => {
    expect(coverRect(400, 200, 100, 100, { zoom: 2, x: 0, y: 0.5 })).toEqual({ x: 0, y: -50, width: 400, height: 200 });
  });
  it('contain mieści całość', () => {
    expect(containRect(400, 200, 100, 100)).toEqual({ x: 0, y: 25, width: 100, height: 50 });
  });
});

describe('panCrop', () => {
  it('przesuwa ognisko proporcjonalnie do nadmiaru i przycina', () => {
    const crop = { zoom: 1, x: 0.5, y: 0.5 };
    expect(panCrop(crop, 25, 0, 400, 200, 100, 100)).toEqual({ zoom: 1, x: 0.25, y: 0.5 });
    expect(panCrop(crop, -500, 0, 400, 200, 100, 100).x).toBe(1);
  });
  it('oś bez nadmiaru nie zmienia się', () => {
    expect(panCrop({ zoom: 1, x: 0.5, y: 0.5 }, 0, 40, 400, 200, 100, 100).y).toBe(0.5);
  });
});

describe('buildCssFilter', () => {
  it('domyślne wartości → none', () => {
    expect(buildCssFilter({ grayscale: 0, sepia: 0, brightness: 100, contrast: 100, saturation: 100, blur: 0 }, 1000)).toBe('none');
  });
  it('składa tylko zmienione filtry, rozmycie względem obrazu', () => {
    expect(buildCssFilter({ grayscale: 100, sepia: 0, brightness: 120, contrast: 100, saturation: 50, blur: 10 }, 2000))
      .toBe('grayscale(1) brightness(1.2) saturate(0.5) blur(20px)');
  });
});

describe('rozpoznawanie plików', () => {
  it('obrazy i projekty', () => {
    expect(isImageFile('Zdjęcie.JPG')).toBe(true);
    expect(isImageFile('a.webp')).toBe(true);
    expect(isImageFile('a.pdf')).toBe(false);
    expect(isProjectFile('C:\\x\\Mój.plakat')).toBe(true);
    expect(isProjectFile('a.json')).toBe(false);
  });
});
```

- [ ] **Step 3: Napisz testy rozmiarów eksportu**

`tests/core/exportSizes.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { exportDims, pdfPage, sanitizeFileName, exportFileName, presentationScale } from '../../src/core/exportSizes.js';

describe('exportDims', () => {
  it('skaluje format', () => {
    expect(exportDims({ w: 1920, h: 1080 }, 2)).toEqual({ width: 3840, height: 2160, pixelRatio: 2 });
    expect(exportDims({ w: 1920, h: 1080 }, 7)).toEqual({ width: 1920, height: 1080, pixelRatio: 1 });
  });
});

describe('pdfPage', () => {
  it('ekranowa strona = rozmiar w pikselach', () => {
    expect(pdfPage({ w: 1080, h: 1920 }, 'screen')).toEqual({ unit: 'px', orientation: 'portrait', pageW: 1080, pageH: 1920, x: 0, y: 0, w: 1080, h: 1920 });
  });
  it('A4 pozioma z marginesem i wyśrodkowaniem', () => {
    const p = pdfPage({ w: 1920, h: 1080 }, 'a4');
    expect(p).toMatchObject({ unit: 'mm', orientation: 'landscape', pageW: 297, pageH: 210 });
    expect(p.w).toBeCloseTo(277);
    expect(p.h).toBeCloseTo(155.81, 1);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo((210 - p.h) / 2);
  });
});

describe('nazwy plików', () => {
  it('usuwa znaki niedozwolone w Windows, zostawia polskie litery', () => {
    expect(sanitizeFileName(' Mój: plakat/2026? ')).toBe('Mój plakat2026');
    expect(sanitizeFileName('...')).toBe('plakat');
    expect(sanitizeFileName('CON')).toBe('CON_');
  });
  it('dodaje orientację i rozszerzenie', () => {
    expect(exportFileName('Promocja', 'portrait', 'png')).toBe('Promocja-pionowo.png');
    expect(exportFileName('', 'landscape', 'pdf')).toBe('plakat-poziomo.pdf');
  });
});

describe('presentationScale', () => {
  it('mieści plakat na ekranie w pikselach fizycznych', () => {
    expect(presentationScale({ w: 1920, h: 1080 }, { width: 2560, height: 1440, scaleFactor: 1.5 })).toBe(2);
    expect(presentationScale({ w: 1080, h: 1920 }, { width: 1920, height: 1080, scaleFactor: 1 })).toBeCloseTo(0.5625);
  });
});
```

- [ ] **Step 4: Uruchom testy — mają nie przejść**

Run: `npx vitest run tests/core/qr.test.js tests/core/image.test.js tests/core/exportSizes.test.js`
Expected: FAIL — brak modułów.

- [ ] **Step 5: Zaimplementuj `src/core/qr.js`**

```js
import QRCode from 'qrcode';

export const QR_KINDS = { url: 'Link do strony', text: 'Dowolny tekst', wifi: 'Sieć Wi-Fi', email: 'E-mail', phone: 'Telefon', vcard: 'Wizytówka (vCard)' };

export const QR_FIELDS = {
  url: [{ key: 'url', label: 'Adres strony', type: 'url', placeholder: 'www.twojastrona.pl' }],
  text: [{ key: 'text', label: 'Tekst', type: 'textarea', placeholder: 'Dowolna wiadomość' }],
  wifi: [
    { key: 'ssid', label: 'Nazwa sieci (SSID)', type: 'text' },
    { key: 'password', label: 'Hasło', type: 'text' },
    { key: 'security', label: 'Zabezpieczenie', type: 'select', options: { WPA: 'WPA/WPA2/WPA3', WEP: 'WEP', nopass: 'Brak hasła' } },
    { key: 'hidden', label: 'Sieć ukryta', type: 'select', options: { false: 'Nie', true: 'Tak' } },
  ],
  email: [
    { key: 'email', label: 'Adres e-mail', type: 'email', placeholder: 'kontakt@firma.pl' },
    { key: 'subject', label: 'Temat (opcjonalnie)', type: 'text' },
    { key: 'body', label: 'Treść (opcjonalnie)', type: 'textarea' },
  ],
  phone: [{ key: 'phone', label: 'Numer telefonu', type: 'tel', placeholder: '+48 600 100 200' }],
  vcard: [
    { key: 'firstName', label: 'Imię', type: 'text' },
    { key: 'lastName', label: 'Nazwisko', type: 'text' },
    { key: 'org', label: 'Firma', type: 'text' },
    { key: 'title', label: 'Stanowisko', type: 'text' },
    { key: 'phone', label: 'Telefon', type: 'tel' },
    { key: 'email', label: 'E-mail', type: 'email' },
    { key: 'url', label: 'Strona www', type: 'url' },
  ],
};

const MAX_PAYLOAD = 1200;
const wifiEscape = (s = '') => String(s).replace(/([\\;,:"])/g, '\\$1');
const vEscape = (s = '') => String(s).replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');
const trim = (s) => String(s ?? '').trim();

export function buildQrPayload(kind, data = {}) {
  switch (kind) {
    case 'url': {
      const url = trim(data.url);
      if (!url) return '';
      return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    }
    case 'text':
      return String(data.text ?? '');
    case 'wifi': {
      const security = ['WPA', 'WEP', 'nopass'].includes(data.security) ? data.security : 'WPA';
      let s = `WIFI:T:${security};S:${wifiEscape(trim(data.ssid))};`;
      if (security !== 'nopass') s += `P:${wifiEscape(data.password ?? '')};`;
      if (data.hidden === 'true') s += 'H:true;';
      return `${s};`;
    }
    case 'email': {
      const params = [];
      if (trim(data.subject)) params.push(`subject=${encodeURIComponent(trim(data.subject))}`);
      if (trim(data.body)) params.push(`body=${encodeURIComponent(trim(data.body))}`);
      return `mailto:${trim(data.email)}${params.length ? `?${params.join('&')}` : ''}`;
    }
    case 'phone':
      return `tel:${trim(data.phone).replace(/[^\d+]/g, '')}`;
    case 'vcard': {
      const first = trim(data.firstName);
      const last = trim(data.lastName);
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vEscape(last)};${vEscape(first)};;;`, `FN:${vEscape([first, last].filter(Boolean).join(' '))}`];
      const optional = [['ORG', data.org], ['TITLE', data.title], ['TEL', data.phone], ['EMAIL', data.email], ['URL', data.url]];
      for (const [key, value] of optional) if (trim(value)) lines.push(`${key}:${vEscape(trim(value))}`);
      lines.push('END:VCARD');
      return lines.join('\r\n');
    }
    default:
      return '';
  }
}

export function qrValidationError(kind, data = {}) {
  if (kind === 'url' && !trim(data.url)) return 'Wpisz adres strony.';
  if (kind === 'text' && !trim(data.text)) return 'Wpisz tekst do zakodowania.';
  if (kind === 'wifi' && !trim(data.ssid)) return 'Wpisz nazwę sieci Wi-Fi.';
  if (kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trim(data.email))) return 'Niepoprawny adres e-mail.';
  if (kind === 'phone' && trim(data.phone).replace(/[^\d]/g, '').length < 3) return 'Wpisz poprawny numer telefonu.';
  if (kind === 'vcard' && !trim(data.firstName) && !trim(data.lastName) && !trim(data.org)) return 'Podaj imię, nazwisko lub firmę.';
  if (new TextEncoder().encode(buildQrPayload(kind, data)).length > MAX_PAYLOAD) return 'Za dużo danych dla kodu QR — skróć treść.';
  return null;
}

export function qrMatrix(payload, ecl = 'M') {
  if (!payload) return null;
  try {
    const qr = QRCode.create(payload, { errorCorrectionLevel: ecl });
    const { modules } = qr;
    return { size: modules.size, isDark: (row, col) => !!modules.get(row, col) };
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Zaimplementuj `src/core/image.js`**

```js
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
```

- [ ] **Step 7: Zaimplementuj `src/core/exportSizes.js`**

```js
export const EXPORT_SCALES = [
  { value: 1, label: '1× — rozmiar projektu' },
  { value: 2, label: '2× — np. 4K' },
  { value: 3, label: '3× — bardzo duży' },
];

export function exportDims(format, scale) {
  const s = EXPORT_SCALES.some((e) => e.value === scale) ? scale : 1;
  return { width: Math.round(format.w * s), height: Math.round(format.h * s), pixelRatio: s };
}

export function pdfPage(format, mode) {
  const landscape = format.w >= format.h;
  const orientation = landscape ? 'landscape' : 'portrait';
  if (mode === 'a4') {
    const pageW = landscape ? 297 : 210;
    const pageH = landscape ? 210 : 297;
    const margin = 10;
    const s = Math.min((pageW - 2 * margin) / format.w, (pageH - 2 * margin) / format.h);
    const w = format.w * s;
    const h = format.h * s;
    return { unit: 'mm', orientation, pageW, pageH, x: (pageW - w) / 2, y: (pageH - h) / 2, w, h };
  }
  return { unit: 'px', orientation, pageW: format.w, pageH: format.h, x: 0, y: 0, w: format.w, h: format.h };
}

export function sanitizeFileName(name) {
  let s = String(name ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  if (!s) return 'plakat';
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(s)) s += '_';
  return s.slice(0, 120);
}

export function exportFileName(name, orientation, ext) {
  return `${sanitizeFileName(name)}-${orientation === 'portrait' ? 'pionowo' : 'poziomo'}.${ext}`;
}

export function presentationScale(format, display) {
  const pw = display.width * display.scaleFactor;
  const ph = display.height * display.scaleFactor;
  return Math.min(pw / format.w, ph / format.h);
}
```

- [ ] **Step 8: Uruchom testy — mają przejść**

Run: `npx vitest run tests/core`
Expected: PASS (wszystkie testy `core`).

- [ ] **Step 9: Commit**

```bash
git add src/core/qr.js src/core/image.js src/core/exportSizes.js tests/core/qr.test.js tests/core/image.test.js tests/core/exportSizes.test.js
git commit -m "feat(core): treści QR (link, Wi-Fi, vCard…), kadrowanie zdjęć, filtry i rozmiary eksportu"
```

---
### Task 11: Pomocnicy DOM, okna dialogowe i ustawienia

**Files:**
- Create: `src/ui/dom.js`, `src/ui/dialogs.js`, `src/core/settings.js`, `src/renderer/settings.js`
- Test: `tests/core/settings.test.js`

**Interfaces:**
- Consumes: nic z wcześniejszych zadań poza `FORMAT`-niezależnymi stałymi.
- Produces:
  - `dom.js`: `h(tag, props, ...children): HTMLElement` (props: `class`, `style` (obiekt), `dataset`, `on<Zdarzenie>`, `html` (tylko zaufane statyczne SVG), właściwości `value|checked|disabled|selected|textContent` ustawiane jako property, reszta jako atrybuty), `clear(el)`, `isTypingTarget(el): boolean` (pole tekstowe / lista / contenteditable)
  - `dialogs.js`: `toast(message, { type: 'info'|'success'|'error', timeout, action: { label, onClick } | null })`, `openModal({ title, body, actions, size, onClose }): { close(result), element }`, `confirmDialog({ title, message, buttons: [{ id, label, kind }] }): Promise<string|null>`, `alertDialog(title, message): Promise<void>`, `promptDialog({ title, label, value, placeholder }): Promise<string|null>`
  - `core/settings.js`: `DEFAULT_SETTINGS`, `mergeSettings(raw): settings`, `addRecentColor(list, hex, max = 12): string[]`
  - `renderer/settings.js`: `createSettings(api): Promise<{ get(key), all, set(patch): Promise<void>, subscribe(fn) }>` (działa także bez `api`)

- [ ] **Step 1: Napisz testy ustawień**

`tests/core/settings.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings, addRecentColor } from '../../src/core/settings.js';

describe('mergeSettings', () => {
  it('zwraca domyślne dla pustych danych', () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('zle')).toEqual(DEFAULT_SETTINGS);
  });
  it('przyjmuje poprawne wartości i odrzuca błędne', () => {
    const s = mergeSettings({ exportScale: 2, exportFormat: 'gif', gridSize: 5000, snap: false, recent: ['a', 3, 'b'], jpgQuality: 0.5 });
    expect(s.exportScale).toBe(2);
    expect(s.exportFormat).toBe('png');
    expect(s.gridSize).toBe(DEFAULT_SETTINGS.gridSize);
    expect(s.snap).toBe(false);
    expect(s.recent).toEqual(['a', 'b']);
    expect(s.jpgQuality).toBe(0.5);
  });
  it('nie zwraca współdzielonych tablic', () => {
    const s = mergeSettings({});
    s.recent.push('x');
    expect(DEFAULT_SETTINGS.recent).toEqual([]);
  });
});

describe('addRecentColor', () => {
  it('dodaje na początek bez duplikatów, z limitem', () => {
    expect(addRecentColor(['#111111', '#222222'], '#222222')).toEqual(['#222222', '#111111']);
    expect(addRecentColor(['#111111'], 'palette:accent')).toEqual(['#111111']);
    const many = Array.from({ length: 12 }, (_, i) => `#0000${String(i).padStart(2, '0')}`);
    expect(addRecentColor(many, '#ffffff')).toHaveLength(12);
    expect(addRecentColor(many, '#FFFFFF')[0]).toBe('#ffffff');
  });
});
```

- [ ] **Step 2: Uruchom — ma nie przejść**

Run: `npx vitest run tests/core/settings.test.js`
Expected: FAIL — brak `settings.js`.

- [ ] **Step 3: Zaimplementuj `src/core/settings.js`**

```js
import { normalizeHex } from './colors.js';

export const DEFAULT_SETTINGS = {
  recent: [],
  lastProjectDir: '',
  lastExportDir: '',
  exportFormat: 'png',
  exportScale: 1,
  exportOrientation: 'current',
  pdfMode: 'screen',
  jpgQuality: 0.92,
  showSafeArea: false,
  showGrid: false,
  gridSize: 40,
  snap: true,
  autosave: true,
  showWelcome: true,
  recentColors: [],
};

const ENUMS = {
  exportFormat: ['png', 'jpg', 'pdf'],
  exportOrientation: ['current', 'landscape', 'portrait', 'both'],
  pdfMode: ['screen', 'a4'],
};

const RANGES = { exportScale: [1, 3], jpgQuality: [0.5, 1], gridSize: [10, 400] };

export function mergeSettings(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = structuredClone(DEFAULT_SETTINGS);
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    const v = src[key];
    if (v === undefined) continue;
    if (Array.isArray(def)) {
      if (Array.isArray(v)) out[key] = v.filter((x) => typeof x === 'string').slice(0, 20);
    } else if (ENUMS[key]) {
      if (ENUMS[key].includes(v)) out[key] = v;
    } else if (typeof def === 'number') {
      const [min, max] = RANGES[key] ?? [-Infinity, Infinity];
      if (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max) out[key] = v;
    } else if (typeof v === typeof def) {
      out[key] = v;
    }
  }
  return out;
}

export function addRecentColor(list, value, max = 12) {
  const hex = normalizeHex(value);
  if (!hex) return list;
  return [hex, ...list.filter((c) => c !== hex)].slice(0, max);
}
```

- [ ] **Step 4: Uruchom — ma przejść**

Run: `npx vitest run tests/core/settings.test.js`
Expected: PASS.

- [ ] **Step 5: Utwórz `src/renderer/settings.js`**

```js
import { DEFAULT_SETTINGS, mergeSettings } from '../core/settings.js';

export async function createSettings(api) {
  let values = structuredClone(DEFAULT_SETTINGS);
  try {
    if (api?.getSettings) values = mergeSettings(await api.getSettings());
  } catch (err) {
    console.warn('Nie udało się wczytać ustawień — używam domyślnych.', err);
  }
  const listeners = new Set();
  return {
    get: (key) => values[key],
    get all() { return values; },
    async set(patch) {
      values = mergeSettings({ ...values, ...patch });
      listeners.forEach((fn) => fn(values));
      try {
        await api?.setSettings?.(patch);
      } catch (err) {
        console.warn('Nie udało się zapisać ustawień.', err);
      }
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
```

- [ ] **Step 6: Utwórz `src/ui/dom.js`**

```js
const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'textContent', 'indeterminate']);

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === undefined || v === null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (PROPS.has(k)) el[k] = v;
    else if (v === false) continue;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export function isTypingTarget(el) {
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}
```

- [ ] **Step 7: Utwórz `src/ui/dialogs.js`**

```js
import { h } from './dom.js';

const shownToasts = new Map();
const modalStack = [];

export function toast(message, { type = 'info', timeout = 3500, action = null } = {}) {
  if (shownToasts.has(message)) return;
  const el = h('div', { class: `toast ${type}`, role: 'status' },
    message,
    action ? h('div', { style: { marginTop: '6px' } }, h('button', { class: 'btn small', onClick: action.onClick }, action.label)) : null);
  document.getElementById('toast-root').append(el);
  const remove = () => {
    el.remove();
    shownToasts.delete(message);
  };
  shownToasts.set(message, el);
  setTimeout(remove, timeout);
  el.addEventListener('click', remove);
}

export function openModal({ title, body, actions = [], size = '', onClose = null }) {
  const root = document.getElementById('modal-root');
  let closed = false;
  const previousFocus = document.activeElement;

  const actionButtons = actions.map((a) =>
    h('button', {
      class: `btn ${a.kind ?? ''}`,
      'data-testid': a.testId,
      onClick: () => (a.onClick ? a.onClick(api) : api.close(a.id)),
    }, a.label),
  );
  const modal = h('div', { class: `modal ${size}`, role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'modal-title' }, title),
    h('div', { class: 'modal-body' }, body),
    actionButtons.length ? h('div', { class: 'modal-actions' }, actionButtons) : null,
  );
  const backdrop = h('div', { class: 'modal-backdrop' }, modal);

  function onKey(e) {
    if (modalStack.at(-1) !== api) return; // Esc zamyka tylko okno na wierzchu
    if (e.key === 'Escape') {
      e.stopPropagation();
      api.close(null);
    }
  }

  const api = {
    element: modal,
    close(result) {
      if (closed) return;
      closed = true;
      modalStack.splice(modalStack.indexOf(api), 1);
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      previousFocus?.focus?.();
      onClose?.(result);
    },
  };

  modalStack.push(api);
  document.addEventListener('keydown', onKey, true);
  root.append(backdrop);
  const primary = actionButtons.find((b) => b.classList.contains('primary'));
  (modal.querySelector('input, textarea, select') ?? primary ?? actionButtons[0])?.focus();
  return api;
}

export function confirmDialog({ title, message, buttons }) {
  return new Promise((resolve) => {
    openModal({
      title,
      size: 'small',
      body: h('p', {}, message),
      actions: buttons.map((b) => ({ id: b.id, label: b.label, kind: b.kind, testId: `confirm-${b.id}` })),
      onClose: resolve,
    });
  });
}

export function alertDialog(title, message) {
  return confirmDialog({ title, message, buttons: [{ id: 'ok', label: 'OK', kind: 'primary' }] }).then(() => undefined);
}

export function promptDialog({ title, label, value = '', placeholder = '' }) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'text', value, placeholder });
    const modal = openModal({
      title,
      size: 'small',
      body: h('div', { class: 'field' }, h('label', {}, label), input),
      actions: [
        { id: null, label: 'Anuluj' },
        { label: 'OK', kind: 'primary', onClick: (m) => m.close(input.value.trim() || null) },
      ],
      onClose: resolve,
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') modal.close(input.value.trim() || null);
    });
    input.select();
  });
}
```

- [ ] **Step 8: Uruchom wszystkie testy i build**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: bez błędów (moduły UI nie są jeszcze importowane — build potwierdza tylko, że nic się nie zepsuło).

- [ ] **Step 9: Commit**

```bash
git add src/ui/dom.js src/ui/dialogs.js src/core/settings.js src/renderer/settings.js tests/core/settings.test.js
git commit -m "feat(ui): pomocnicy DOM, okna dialogowe, powiadomienia i ustawienia"
```

---
### Task 12: Fundament płótna — scena, renderowanie, tło i tekst

**Files:**
- Create: `src/canvas/imageCache.js`, `src/canvas/fontLoader.js`, `src/canvas/nodes/background.js`, `src/canvas/nodes/text.js`, `src/canvas/nodes/index.js`, `src/canvas/render.js`, `src/canvas/editor.js`
- Modify: `src/renderer/main.js` (pełna nowa treść)

**Interfaces:**
- Consumes: `resolveColor`, `resolveFont` (model), `coverRect`, `buildCssFilter` (image), `fitFontSize` (textfit), `BUNDLED_FONTS`, `FONT_SAMPLE`, `cssFontSpec`, `fontStyleString` (fonts), `createStore`, `createSelection`, `newDocument`, `createSettings`.
- Produces:
  - Kontrakt węzła elementu (każdy plik w `canvas/nodes/`): `{ create(group: Konva.Group): void, update(group, el, box, ctx): void }`. `group` ma atrybuty `boxW`, `boxH`; potomek o nazwie `hit` (przezroczysty prostokąt) odpowiada za klikanie.
  - `ctx` przekazywany do `update`: `{ doc, color(value, fallback?), font(value), image(assetId): HTMLImageElement|null, asset(assetId), filtered(assetId, img, cssFilter): CanvasImageSource, exporting: boolean }` (`exporting` = rysowanie do pliku — węzły ukrywają wtedy napisy zastępcze)
  - `imageCache.js`: `setImageChangeHandler(fn)`, `getImage(assetId, asset)`, `getFiltered(assetId, img, filter, quality: 'preview'|'full')`, `whenImagesReady(doc, assets): Promise<void>`
  - `fontLoader.js`: `preloadBundledFonts(): Promise<void>`, `ensureFontsForDoc(doc, onLoaded)`
  - `render.js`: `createRenderer(posterGroup, { quality })` → `{ render(doc, assets), groupFor(id), liveUpdate(id, doc, assets, box), reset() }`
  - `editor.js`: `createEditor({ container, store })` → `{ stage, posterLayer, uiLayer, posterGroup, renderer, get view(), fit(), zoomAt(scale, point?), zoomBy(factor, point?), panBy(dx, dy), renderNow(), scheduleRender(), setInteracting(bool), elementAt(clientX, clientY): id|null, toDesign(clientX, clientY): {x,y}, withExportView(fn, { doc, quality }), on(event, fn) }` (zdarzenia: `'view'`, `'rendered'`)
  - `renderer/main.js`: obiekt `app = { api, settings, store, selection, editor, actions: {}, ui: {} }`, tablica `FEATURES` z funkcjami `install(app)` (kolejne zadania dopisują swoje moduły), `document.body.dataset.ready = 'true'` po starcie, `window.__plakat = app` w trybie E2E.

- [ ] **Step 1: Utwórz `src/canvas/imageCache.js`**

```js
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
  const c2d = canvas.getContext('2d');
  if (filter.includes('blur(')) c2d.drawImage(img, 0, 0, canvas.width, canvas.height);
  c2d.filter = filter;
  c2d.drawImage(img, 0, 0, canvas.width, canvas.height);
  filtered.set(key, canvas);
  if (filtered.size > MAX_FILTERED) filtered.delete(filtered.keys().next().value);
  return canvas;
}
```

(Podgląd przeskalowuje duże zdjęcia do 1600 px, żeby suwaki filtrów działały płynnie; eksport używa `quality: 'full'`.)

- [ ] **Step 2: Utwórz `src/canvas/fontLoader.js`**

```js
import { BUNDLED_FONTS, FONT_SAMPLE, cssFontSpec } from '../core/fonts.js';
import { resolveFont } from '../core/model.js';

const loaded = new Set();
const keyOf = (family, bold, italic) => `${family}|${bold ? 1 : 0}|${italic ? 1 : 0}`;

function loadFace(family, bold, italic) {
  const key = keyOf(family, bold, italic);
  if (loaded.has(key)) return Promise.resolve();
  return document.fonts
    .load(cssFontSpec(family, { bold, italic }, 40), FONT_SAMPLE)
    .catch(() => [])
    .then(() => {
      loaded.add(key);
    });
}

export async function preloadBundledFonts() {
  const jobs = [];
  for (const f of BUNDLED_FONTS) {
    for (const bold of f.bold ? [false, true] : [false]) {
      for (const italic of f.italic ? [false, true] : [false]) jobs.push(loadFace(f.family, bold, italic));
    }
  }
  await Promise.allSettled(jobs);
}

export function ensureFontsForDoc(doc, onLoaded) {
  const pending = [];
  for (const el of Object.values(doc.elements)) {
    if (el.type !== 'text' && el.type !== 'points') continue;
    const family = resolveFont(doc, el.font);
    if (!loaded.has(keyOf(family, el.bold, el.italic))) pending.push(loadFace(family, el.bold, el.italic));
  }
  if (pending.length) Promise.allSettled(pending).then(onLoaded);
}
```

- [ ] **Step 3: Utwórz `src/canvas/nodes/background.js`**

```js
import Konva from 'konva';
import { coverRect, buildCssFilter } from '../../core/image.js';

const NEUTRAL = { grayscale: 0, sepia: 0, brightness: 100, contrast: 100, saturation: 100, blur: 0 };

function patternScene(kind, w, h, size, color) {
  const s = Math.max(8, size);
  return (ctx) => {
    ctx.beginPath();
    if (kind === 'dots') {
      const r = s * 0.09;
      for (let y = s / 2; y < h; y += s) {
        for (let x = s / 2; x < w; x += s) {
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.setAttr('fillStyle', color);
      ctx.fill();
      return;
    }
    if (kind === 'grid') {
      for (let x = 0; x <= w; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y <= h; y += s) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    } else if (kind === 'diagonal') {
      for (let x = -h; x < w; x += s) { ctx.moveTo(x, h); ctx.lineTo(x + h, 0); }
    } else if (kind === 'waves') {
      const amp = s * 0.18;
      for (let y = s / 2; y < h + s; y += s) {
        ctx.moveTo(0, y);
        for (let x = 0; x <= w + s / 8; x += s / 8) ctx.lineTo(x, y + Math.sin((x / s) * Math.PI * 2) * amp);
      }
    }
    ctx.setAttr('strokeStyle', color);
    ctx.setAttr('lineWidth', Math.max(1, s * 0.04));
    ctx.stroke();
  };
}

export const backgroundNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'background' }));
    group.add(new Konva.Image({ name: 'bg-image', listening: false, visible: false }));
    group.add(new Konva.Rect({ name: 'bg-dim', listening: false, visible: false }));
    group.add(new Konva.Shape({ name: 'bg-pattern', listening: false, visible: false }));
  },

  update(group, doc, fmt, ctx) {
    const { w, h } = fmt;
    const bg = doc.background;
    const c1 = ctx.color('palette:bg');
    const c2 = ctx.color('palette:bg2');
    const base = group.findOne('.background');
    base.setAttrs({ x: 0, y: 0, width: w, height: h, fill: c1, fillPriority: 'color' });

    if (bg.type === 'linear') {
      const rad = (bg.angle * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);
      const half = Math.abs((w / 2) * dx) + Math.abs((h / 2) * dy);
      base.setAttrs({
        fillPriority: 'linear-gradient',
        fillLinearGradientStartPoint: { x: w / 2 - dx * half, y: h / 2 - dy * half },
        fillLinearGradientEndPoint: { x: w / 2 + dx * half, y: h / 2 + dy * half },
        fillLinearGradientColorStops: [0, c1, 1, c2],
      });
    } else if (bg.type === 'radial') {
      base.setAttrs({
        fillPriority: 'radial-gradient',
        fillRadialGradientStartPoint: { x: w / 2, y: h / 2 },
        fillRadialGradientEndPoint: { x: w / 2, y: h / 2 },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndRadius: Math.hypot(w, h) / 2,
        fillRadialGradientColorStops: [0, c2, 1, c1],
      });
    }

    const imgNode = group.findOne('.bg-image');
    const dim = group.findOne('.bg-dim');
    const img = bg.type === 'image' ? ctx.image(bg.imageId) : null;
    if (img) {
      const longest = Math.max(img.naturalWidth, img.naturalHeight);
      const source = ctx.filtered(bg.imageId, img, buildCssFilter({ ...NEUTRAL, blur: bg.blur }, longest));
      const r = coverRect(img.naturalWidth, img.naturalHeight, w, h);
      imgNode.setAttrs({ image: source, x: r.x, y: r.y, width: r.width, height: r.height, visible: true });
      dim.setAttrs({ x: 0, y: 0, width: w, height: h, fill: c1, opacity: bg.dim, visible: bg.dim > 0 });
    } else {
      imgNode.visible(false);
      dim.visible(false);
    }

    const pattern = group.findOne('.bg-pattern');
    if (bg.type === 'pattern') {
      pattern.setAttrs({
        visible: true,
        opacity: bg.patternOpacity,
        sceneFunc: patternScene(bg.pattern, w, h, bg.patternSize, ctx.color(bg.patternColor)),
      });
    } else {
      pattern.visible(false);
    }
  },
};
```

- [ ] **Step 4: Utwórz `src/canvas/nodes/text.js`**

```js
import Konva from 'konva';
import { fontStyleString } from '../../core/fonts.js';
import { fitFontSize } from '../../core/textfit.js';

export function applyTextStyle(node, el, ctx, size = el.size) {
  node.setAttrs({
    fontFamily: ctx.font(el.font),
    fontStyle: fontStyleString(el),
    fontSize: size,
    letterSpacing: el.letterSpacing ?? 0,
    lineHeight: el.lineHeight ?? 1.2,
    fill: ctx.color(el.color),
    stroke: ctx.color(el.strokeColor ?? '#000000'),
    strokeWidth: el.strokeWidth ?? 0,
    strokeEnabled: (el.strokeWidth ?? 0) > 0,
    fillAfterStrokeEnabled: true,
    shadowEnabled: !!el.shadow,
    shadowColor: 'rgba(0,0,0,0.55)',
    shadowBlur: size * 0.18,
    shadowOffset: { x: 0, y: size * 0.06 },
  });
}

export function displayText(el) {
  return el.uppercase ? el.text.toLocaleUpperCase('pl-PL') : el.text;
}

export const textNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    group.add(new Konva.Text({ name: 'label', wrap: 'word', listening: false }));
  },

  update(group, el, box, ctx) {
    group.findOne('.hit').size({ width: box.w, height: box.h });
    const label = group.findOne('.label');
    label.setAttrs({ text: displayText(el), width: box.w, align: el.align, x: 0, y: 0 });
    label.setAttr('height', undefined);
    applyTextStyle(label, el, ctx);
    let size = el.size;
    if (el.autoFit) {
      size = fitFontSize((s) => {
        label.fontSize(s);
        return { width: 0, height: label.height() };
      }, { maxSize: el.size, minSize: 8, boxHeight: box.h });
      applyTextStyle(label, el, ctx, size);
    }
    const textHeight = label.height();
    let y = 0;
    if (el.valign === 'middle') y = (box.h - textHeight) / 2;
    if (el.valign === 'bottom') y = box.h - textHeight;
    label.y(y);
  },
};
```

- [ ] **Step 5: Utwórz `src/canvas/nodes/index.js`**

```js
import { textNode } from './text.js';

export const NODE_TYPES = {
  text: textNode,
};
```

- [ ] **Step 6: Utwórz `src/canvas/render.js`**

```js
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
    doc.order.forEach((id, index) => {
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
      group.zIndex(index + 1);
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
```

- [ ] **Step 7: Utwórz `src/canvas/editor.js`**

```js
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
```

- [ ] **Step 8: Zastąp `src/renderer/main.js`**

```js
import { createStore } from '../core/store.js';
import { createSelection } from '../core/selection.js';
import { newDocument } from '../core/document.js';
import { createEditor } from '../canvas/editor.js';
import { preloadBundledFonts } from '../canvas/fontLoader.js';
import { createSettings } from './settings.js';

// Moduły funkcji: każdy eksportuje install(app). Kolejne zadania dopisują tu swoje moduły.
// Moduły UI (pasek narzędzi, panele) muszą być na końcu — korzystają z akcji zarejestrowanych wcześniej.
const FEATURES = [];

async function start() {
  await preloadBundledFonts();
  const api = window.api ?? {};
  const settings = await createSettings(api);
  const store = createStore(newDocument());
  const selection = createSelection();
  const editor = createEditor({ container: document.getElementById('stage'), store });
  const app = { api, settings, store, selection, editor, actions: {}, ui: {} };
  store.subscribe((doc) => selection.prune(doc));
  for (const install of FEATURES) await install(app);
  editor.fit();
  editor.renderNow();
  document.body.dataset.ready = 'true';
  if (api.isE2E) window.__plakat = app;
  return app;
}

start().catch((err) => {
  console.error(err);
  document.getElementById('statusbar').textContent = `Błąd uruchamiania: ${err.message}`;
});
```

- [ ] **Step 9: Uruchom i sprawdź ręcznie**

Run: `npm start`
Expected (lista kontrolna):
- Na środku obszaru roboczego widać plakat 16:9 z ciemnym gradientem (motyw „Nocny”) i cieniem.
- Widoczne są: duży tytuł „Twój tytuł” (Montserrat, pogrubiony), szary podtytuł i stopka na dole po prawej stronie (zdjęcie, punkty i QR pojawią się w następnych zadaniach).
- Zmiana rozmiaru okna dopasowuje plakat do obszaru.
- F12 otwiera narzędzia deweloperskie (tylko w trybie deweloperskim) — w konsoli brak błędów.

Run: `npm test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/canvas src/renderer/main.js
git commit -m "feat(canvas): scena Konva, renderowanie dokumentu, tło (gradienty, wzory, zdjęcie) i tekst"
```

---
### Task 13: Zdjęcie i obrazy — kształty, filtry, ramka, cień, import (plik, przeciąganie, schowek)

**Files:**
- Create: `src/canvas/shapes.js`, `src/canvas/nodes/photo.js`, `src/canvas/nodes/image.js`, `src/renderer/images.js`
- Modify: `src/canvas/nodes/index.js`, `src/renderer/main.js`

**Interfaces:**
- Consumes: `coverRect`, `containRect`, `buildCssFilter`, `downscaleSize`, `isImageFile`, `isProjectFile` (image), `mix` (colors), `IMAGE_MAX_SIDE`, `addElement` (elementOps), `findByRole` (document), `toast` (dialogs), `isTypingTarget` (dom), `editor.elementAt`, `editor.toDesign`.
- Produces:
  - `shapes.js`: `roundRectPath(ctx, x, y, w, h, r)`, `shapeBounds(shape, w, h): { x, y, w, h }`, `tracePhotoShape(ctx, shape, w, h, radius)`
  - `nodes/photo.js`: `photoNode`, `nodes/image.js`: `imageNode`
  - `images.js`: `readImageFile(file): Promise<{ dataUrl, w, h, name }>`, `pickFiles(accept, multiple = false): Promise<File[]>`, `installImages(app)` rejestrujący akcje: `pickPhoto(targetId?)`, `addImageElement()`, `pickBackgroundImage()`, `pickQrLogo(qrId)`, `removeImage(id)`, `importImageFile(file, targetId?)`; obsługuje przeciąganie plików na `#workspace` (obraz → zdjęcie pod kursorem / zaznaczone / rola `photo`; Alt lub kilka plików → nowe elementy `image`; `.plakat` → `app.actions.openProjectFile(file)` jeśli istnieje) oraz wklejanie obrazu (Ctrl+V).

- [ ] **Step 1: Utwórz `src/canvas/shapes.js`**

```js
export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function shapeBounds(shape, w, h) {
  if (shape === 'circle') {
    const d = Math.min(w, h);
    return { x: (w - d) / 2, y: (h - d) / 2, w: d, h: d };
  }
  return { x: 0, y: 0, w, h };
}

export function tracePhotoShape(ctx, shape, w, h, radius = 0) {
  ctx.beginPath();
  switch (shape) {
    case 'circle': {
      const b = shapeBounds(shape, w, h);
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
      ctx.closePath();
      break;
    }
    case 'rounded':
      roundRectPath(ctx, 0, 0, w, h, radius);
      break;
    case 'arch': {
      const r = w / 2;
      if (h < r) {
        roundRectPath(ctx, 0, 0, w, h, h / 2);
        break;
      }
      ctx.moveTo(0, h);
      ctx.lineTo(0, r);
      ctx.arc(r, r, r, Math.PI, 0, false);
      ctx.lineTo(w, h);
      ctx.closePath();
      break;
    }
    case 'hexagon':
      ctx.moveTo(w * 0.25, 0);
      ctx.lineTo(w * 0.75, 0);
      ctx.lineTo(w, h / 2);
      ctx.lineTo(w * 0.75, h);
      ctx.lineTo(w * 0.25, h);
      ctx.lineTo(0, h / 2);
      ctx.closePath();
      break;
    default:
      ctx.rect(0, 0, w, h);
  }
}
```

- [ ] **Step 2: Utwórz `src/canvas/nodes/photo.js`**

```js
import Konva from 'konva';
import { coverRect, buildCssFilter } from '../../core/image.js';
import { mix } from '../../core/colors.js';
import { tracePhotoShape, shapeBounds } from '../shapes.js';

export const photoNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    group.add(new Konva.Shape({ name: 'shadow', listening: false }));
    const frame = new Konva.Group({ name: 'frame', listening: false });
    frame.add(new Konva.Rect({ name: 'placeholder-bg' }));
    frame.add(new Konva.Text({ name: 'placeholder-text', align: 'center', verticalAlign: 'middle', wrap: 'word', lineHeight: 1.3 }));
    frame.add(new Konva.Image({ name: 'img', visible: false }));
    group.add(frame);
    group.add(new Konva.Shape({ name: 'border', listening: false }));
  },

  update(group, el, box, ctx) {
    const { w, h } = box;
    const path = (c) => tracePhotoShape(c, el.shape, w, h, el.radius);
    const bounds = shapeBounds(el.shape, w, h);
    group.findOne('.hit').size({ width: w, height: h });

    const frame = group.findOne('.frame');
    frame.clipFunc(path);
    const imgNode = frame.findOne('.img');
    const phBg = frame.findOne('.placeholder-bg');
    const phText = frame.findOne('.placeholder-text');
    const img = ctx.image(el.assetId);

    if (img) {
      const longest = Math.max(img.naturalWidth, img.naturalHeight);
      const source = ctx.filtered(el.assetId, img, buildCssFilter(el.filters, longest));
      const r = coverRect(img.naturalWidth, img.naturalHeight, bounds.w, bounds.h, el.crop);
      imgNode.setAttrs({
        image: source,
        visible: true,
        x: el.flipX ? bounds.x + r.x + r.width : bounds.x + r.x,
        y: bounds.y + r.y,
        width: r.width,
        height: r.height,
        scaleX: el.flipX ? -1 : 1,
      });
      phBg.visible(false);
      phText.visible(false);
    } else {
      imgNode.visible(false);
      phBg.setAttrs({ visible: true, x: 0, y: 0, width: w, height: h, fill: mix(ctx.color('palette:bg2'), ctx.color('palette:text'), 0.1) });
      phText.setAttrs({
        visible: !ctx.exporting,
        x: bounds.x,
        y: bounds.y,
        width: bounds.w,
        height: bounds.h,
        padding: 16,
        text: el.assetId ? 'Wczytywanie zdjęcia…' : 'Kliknij dwukrotnie\nlub przeciągnij tutaj zdjęcie',
        fontSize: Math.max(14, Math.min(bounds.w, bounds.h) * 0.065),
        fontFamily: ctx.font('body'),
        fill: ctx.color('palette:muted'),
      });
    }

    const minSide = Math.min(w, h);
    group.findOne('.shadow').setAttrs({
      visible: !!el.shadow,
      sceneFunc: (c, shape) => {
        path(c);
        c.fillStrokeShape(shape);
      },
      fill: ctx.color('palette:bg'),
      shadowColor: 'rgba(0,0,0,0.6)',
      shadowBlur: minSide * 0.06,
      shadowOffset: { x: 0, y: minSide * 0.025 },
    });

    group.findOne('.border').setAttrs({
      visible: el.borderWidth > 0,
      sceneFunc: (c, shape) => {
        path(c);
        c.strokeShape(shape);
      },
      stroke: ctx.color(el.borderColor),
      strokeWidth: el.borderWidth,
    });
  },
};
```

- [ ] **Step 3: Utwórz `src/canvas/nodes/image.js`**

```js
import Konva from 'konva';
import { coverRect, containRect } from '../../core/image.js';
import { roundRectPath } from '../shapes.js';

export const imageNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    const frame = new Konva.Group({ name: 'frame', listening: false });
    frame.add(new Konva.Rect({ name: 'placeholder', dash: [12, 8] }));
    frame.add(new Konva.Text({ name: 'placeholder-text', align: 'center', verticalAlign: 'middle', text: 'Obraz — kliknij dwukrotnie' }));
    frame.add(new Konva.Image({ name: 'img', visible: false }));
    group.add(frame);
  },

  update(group, el, box, ctx) {
    const { w, h } = box;
    group.findOne('.hit').size({ width: w, height: h });
    const frame = group.findOne('.frame');
    frame.clipFunc((c) => {
      c.beginPath();
      roundRectPath(c, 0, 0, w, h, el.radius);
    });
    frame.opacity(el.opacity);
    const imgNode = frame.findOne('.img');
    const ph = frame.findOne('.placeholder');
    const phText = frame.findOne('.placeholder-text');
    const img = ctx.image(el.assetId);
    if (img) {
      const r = el.fit === 'cover'
        ? coverRect(img.naturalWidth, img.naturalHeight, w, h)
        : containRect(img.naturalWidth, img.naturalHeight, w, h);
      imgNode.setAttrs({ image: ctx.filtered(el.assetId, img, 'none'), visible: true, x: r.x, y: r.y, width: r.width, height: r.height });
      ph.visible(false);
      phText.visible(false);
    } else {
      imgNode.visible(false);
      ph.setAttrs({ visible: !ctx.exporting, width: w, height: h, stroke: ctx.color('palette:muted'), strokeWidth: 3, fill: 'rgba(0,0,0,0.08)' });
      phText.setAttrs({ visible: !ctx.exporting, width: w, height: h, fontSize: Math.max(12, Math.min(w, h) * 0.08), fontFamily: ctx.font('body'), fill: ctx.color('palette:muted') });
    }
  },
};
```

- [ ] **Step 4: Zastąp `src/canvas/nodes/index.js`**

```js
import { textNode } from './text.js';
import { photoNode } from './photo.js';
import { imageNode } from './image.js';

export const NODE_TYPES = {
  text: textNode,
  photo: photoNode,
  image: imageNode,
};
```

- [ ] **Step 5: Utwórz `src/renderer/images.js`**

```js
import { downscaleSize, isImageFile, isProjectFile } from '../core/image.js';
import { IMAGE_MAX_SIDE } from '../core/constants.js';
import { addElement } from '../core/elementOps.js';
import { findByRole } from '../core/document.js';
import { toast } from '../ui/dialogs.js';
import { isTypingTarget } from '../ui/dom.js';

const MAX_FILE_BYTES = 60 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error('Błąd odczytu pliku.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Plik nie jest poprawnym obrazem.'));
    img.src = src;
  });
}

export async function readImageFile(file) {
  if (!file.type.startsWith('image/') && !isImageFile(file.name)) throw new Error('To nie jest obraz.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Obraz jest za duży (ponad 60 MB).');
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const { w, h, scaled } = downscaleSize(img.naturalWidth, img.naturalHeight, IMAGE_MAX_SIDE);
  if (!scaled) return { dataUrl, w, h, name: file.name };
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c2d = canvas.getContext('2d');
  c2d.imageSmoothingQuality = 'high';
  c2d.drawImage(img, 0, 0, w, h);
  const keepAlpha = /png|webp|gif/i.test(file.type);
  return { dataUrl: canvas.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.92), w, h, name: file.name };
}

export function pickFiles(accept, multiple = false) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.addEventListener('change', () => resolve([...input.files]));
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');

export function installImages(app) {
  const { store, selection, editor } = app;

  async function importImage(file) {
    try {
      return await readImageFile(file);
    } catch (err) {
      toast(`Nie można wczytać obrazu: ${err.message}`, { type: 'error' });
      return null;
    }
  }

  function imageTarget(preferredId) {
    const doc = store.doc;
    const isImageEl = (el) => el && (el.type === 'photo' || el.type === 'image');
    if (isImageEl(doc.elements[preferredId])) return preferredId;
    const selected = selection.ids.map((id) => doc.elements[id]).find(isImageEl);
    return selected?.id ?? findByRole(doc, 'photo')?.id ?? null;
  }

  function addImageElementWith(assetId, at = null) {
    let id;
    store.update((doc) => {
      id = addElement(doc, 'image', { overrides: { assetId }, at });
    });
    selection.set([id]);
  }

  async function importImageFile(file, targetId = null) {
    const image = await importImage(file);
    if (!image) return;
    const assetId = store.addAsset(image);
    const id = imageTarget(targetId);
    if (!id) {
      addImageElementWith(assetId);
      return;
    }
    store.update((doc) => {
      const el = doc.elements[id];
      if (!el) return false;
      el.assetId = assetId;
      if (el.type === 'photo') el.crop = { zoom: 1, x: 0.5, y: 0.5 };
    });
    selection.set([id]);
  }

  async function pickOne() {
    const [file] = await pickFiles('image/*');
    return file ? importImage(file) : null;
  }

  app.actions.importImageFile = importImageFile;

  app.actions.pickPhoto = async (targetId = null) => {
    const [file] = await pickFiles('image/*');
    if (file) await importImageFile(file, targetId);
  };

  app.actions.addImageElement = async () => {
    const image = await pickOne();
    if (image) addImageElementWith(store.addAsset(image));
  };

  app.actions.pickBackgroundImage = async () => {
    const image = await pickOne();
    if (!image) return;
    const assetId = store.addAsset(image);
    store.update((doc) => {
      doc.background.imageId = assetId;
      doc.background.type = 'image';
    });
  };

  app.actions.pickQrLogo = async (qrId) => {
    const image = await pickOne();
    if (!image) return;
    const assetId = store.addAsset(image);
    store.update((doc) => {
      if (!doc.elements[qrId]) return false;
      doc.elements[qrId].logoAssetId = assetId;
    });
  };

  app.actions.removeImage = (id) => {
    store.update((doc) => {
      const el = doc.elements[id];
      if (!el) return false;
      if (el.type === 'qr') el.logoAssetId = null;
      else el.assetId = null;
    });
  };

  const workspace = document.getElementById('workspace');
  const overlay = document.getElementById('drop-overlay');
  let depth = 0;

  workspace.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth++;
    overlay.hidden = false;
  });
  workspace.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  workspace.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) overlay.hidden = true;
  });
  workspace.addEventListener('drop', async (e) => {
    e.preventDefault();
    depth = 0;
    overlay.hidden = true;
    const files = [...(e.dataTransfer?.files ?? [])];
    const project = files.find((f) => isProjectFile(f.name));
    if (project) {
      if (app.actions.openProjectFile) await app.actions.openProjectFile(project);
      return;
    }
    const images = files.filter((f) => f.type.startsWith('image/') || isImageFile(f.name));
    if (!images.length) {
      toast('Upuść plik obrazu (PNG, JPG, WEBP…) albo projekt .plakat.', { type: 'error' });
      return;
    }
    if (e.altKey || images.length > 1) {
      const at = editor.toDesign(e.clientX, e.clientY);
      for (const file of images) {
        const image = await importImage(file);
        if (image) addImageElementWith(store.addAsset(image), at);
      }
      return;
    }
    await importImageFile(images[0], editor.elementAt(e.clientX, e.clientY));
  });

  // Upuszczenie pliku poza obszarem roboczym nie może przeładować okna.
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  document.addEventListener('paste', async (e) => {
    if (isTypingTarget(e.target)) return;
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    const blob = item.getAsFile();
    if (blob) await importImageFile(new File([blob], 'schowek.png', { type: blob.type }));
  });
}
```

- [ ] **Step 6: Podłącz moduł w `src/renderer/main.js`**

Dodaj import pod `import { createSettings } from './settings.js';`:
```js
import { installImages } from './images.js';
```
Zmień linię `const FEATURES = [];` na:
```js
const FEATURES = [installImages];
```

- [ ] **Step 7: Sprawdź ręcznie**

Run: `npm start`
Expected:
- Po lewej stronie plakatu widać zaokrąglony prostokąt z cieniem i napisem „Kliknij dwukrotnie lub przeciągnij tutaj zdjęcie”.
- Przeciągnięcie pliku JPG z Eksploratora na okno pokazuje niebieską ramkę „Upuść zdjęcie…”, a po upuszczeniu zdjęcie wypełnia ramkę (kadr „cover”, wyśrodkowany).
- Zdjęcie o boku 6000 px wczytuje się bez zacięcia (zmniejszenie do 3000 px).
- Skopiowanie obrazu (np. zrzut ekranu Win+Shift+S) i wciśnięcie Ctrl+V w oknie wstawia go do zdjęcia.
- Upuszczenie z wciśniętym Alt dodaje nowy element „Obraz” w miejscu kursora.
- Upuszczenie pliku `.txt` pokazuje czerwony komunikat i nic nie psuje.

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/canvas/shapes.js src/canvas/nodes src/renderer/images.js src/renderer/main.js
git commit -m "feat(canvas): zdjęcie w kształtach z filtrami, ramką i cieniem; import przez przeciąganie i schowek"
```

---
### Task 14: Punkty, kod QR i kształty na płótnie

**Files:**
- Create: `src/canvas/nodes/points.js`, `src/canvas/nodes/qr.js`, `src/canvas/nodes/shape.js`
- Modify: `src/canvas/nodes/index.js`

**Interfaces:**
- Consumes: `fitPoints`, `layoutPoints` (textfit), `fontStyleString` (fonts), `BULLETS` (constants), `buildQrPayload`, `qrValidationError`, `qrMatrix` (qr), `roundRectPath` (shapes), kontrakt węzła z Zadania 12.
- Produces: `pointsNode`, `qrNode`, `shapeNode`; pełny rejestr `NODE_TYPES = { text, photo, image, points, qr, shape }`.

- [ ] **Step 1: Utwórz `src/canvas/nodes/points.js`**

```js
import Konva from 'konva';
import { fitPoints, layoutPoints } from '../../core/textfit.js';
import { fontStyleString } from '../../core/fonts.js';
import { BULLETS } from '../../core/constants.js';

function bulletChar(el, index) {
  if (el.bullet === 'number') return `${index + 1}.`;
  if (el.bullet === 'custom') return el.customBullet || '•';
  return BULLETS[el.bullet]?.char ?? '•';
}

export const pointsNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    group.add(new Konva.Group({ name: 'items', listening: false }));
  },

  update(group, el, box, ctx) {
    group.findOne('.hit').size({ width: box.w, height: box.h });
    const items = group.findOne('.items');
    items.destroyChildren();
    const texts = el.items.map((t) => t.trim()).filter(Boolean);
    if (!texts.length) return;

    const fontFamily = ctx.font(el.font);
    const fontStyle = fontStyleString({ bold: el.bold });
    const digits = String(texts.length).length;
    const bulletWidth = (s) => (el.bullet === 'number' ? s * (digits * 0.62 + 0.8) : s * 1.25);
    const probe = new Konva.Text({ fontFamily, fontStyle, lineHeight: el.lineHeight, wrap: 'word' });
    const measureItem = (i, s) => {
      probe.setAttrs({ text: texts[i], fontSize: s, width: Math.max(10, box.w - bulletWidth(s)) });
      return probe.height();
    };

    const size = el.autoFit
      ? fitPoints(measureItem, texts.length, { maxSize: el.size, minSize: 8, spacing: el.spacing, boxHeight: box.h })
      : el.size;
    const heights = texts.map((_, i) => measureItem(i, size));
    const { ys } = layoutPoints(heights, { gap: size * el.spacing, boxHeight: box.h, distribute: el.distribute });
    probe.destroy();

    const bw = bulletWidth(size);
    const bulletSize = el.bullet === 'dot' ? size * 0.7 : size;
    const bulletOffset = ((size - bulletSize) * el.lineHeight) / 2;
    texts.forEach((text, i) => {
      items.add(new Konva.Text({
        x: 0,
        y: ys[i] + bulletOffset,
        width: bw,
        text: bulletChar(el, i),
        fontFamily,
        fontStyle: 'bold',
        fontSize: bulletSize,
        lineHeight: el.lineHeight,
        fill: ctx.color(el.bulletColor),
      }));
      items.add(new Konva.Text({
        x: bw,
        y: ys[i],
        width: Math.max(10, box.w - bw),
        text,
        fontFamily,
        fontStyle,
        fontSize: size,
        lineHeight: el.lineHeight,
        wrap: 'word',
        fill: ctx.color(el.color),
      }));
    });
  },
};
```

- [ ] **Step 2: Utwórz `src/canvas/nodes/qr.js`**

```js
import Konva from 'konva';
import { buildQrPayload, qrValidationError, qrMatrix } from '../../core/qr.js';
import { roundRectPath } from '../shapes.js';

const matrixCache = new Map();

function cachedMatrix(payload, ecl) {
  const key = `${ecl}|${payload}`;
  if (!matrixCache.has(key)) {
    matrixCache.set(key, qrMatrix(payload, ecl));
    if (matrixCache.size > 50) matrixCache.delete(matrixCache.keys().next().value);
  }
  return matrixCache.get(key);
}

const isFinder = (r, c, n) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

function drawFinder(ctx, x, y, cell, fg, bg) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, 7 * cell, 7 * cell, cell * 1.6);
  ctx.setAttr('fillStyle', fg);
  ctx.fill();
  ctx.beginPath();
  roundRectPath(ctx, x + cell, y + cell, 5 * cell, 5 * cell, cell * 1.1);
  ctx.setAttr('fillStyle', bg);
  ctx.fill();
  ctx.beginPath();
  roundRectPath(ctx, x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell, cell * 0.8);
  ctx.setAttr('fillStyle', fg);
  ctx.fill();
}

function drawCode(ctx, matrix, { size, margin, style, fg, bg }) {
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.setAttr('fillStyle', bg);
  ctx.fill();

  const n = matrix.size;
  const cell = size / (n + margin * 2);
  const off = margin * cell;
  const overlap = cell * 0.04;
  ctx.beginPath();
  for (let r = 0; r < n; r++) {
    if (style === 'square') {
      let c = 0;
      while (c < n) {
        if (!matrix.isDark(r, c)) {
          c++;
          continue;
        }
        let end = c;
        while (end < n && matrix.isDark(r, end)) end++;
        ctx.rect(off + c * cell, off + r * cell, (end - c) * cell + overlap, cell + overlap);
        c = end;
      }
    } else {
      for (let c = 0; c < n; c++) {
        if (!matrix.isDark(r, c) || isFinder(r, c, n)) continue;
        const x = off + c * cell;
        const y = off + r * cell;
        if (style === 'dots') {
          ctx.moveTo(x + cell * 0.95, y + cell / 2);
          ctx.arc(x + cell / 2, y + cell / 2, cell * 0.45, 0, Math.PI * 2);
        } else {
          roundRectPath(ctx, x + cell * 0.04, y + cell * 0.04, cell * 0.92, cell * 0.92, cell * 0.32);
        }
      }
    }
  }
  ctx.setAttr('fillStyle', fg);
  ctx.fill();
  if (style !== 'square') {
    for (const [fr, fc] of [[0, 0], [0, n - 7], [n - 7, 0]]) drawFinder(ctx, off + fc * cell, off + fr * cell, cell, fg, bg);
  }
}

export const qrNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    group.add(new Konva.Rect({ name: 'card', listening: false }));
    group.add(new Konva.Shape({ name: 'code', listening: false }));
    group.add(new Konva.Text({ name: 'placeholder', listening: false, align: 'center', verticalAlign: 'middle', wrap: 'word' }));
    group.add(new Konva.Rect({ name: 'logo-bg', listening: false }));
    group.add(new Konva.Image({ name: 'logo', listening: false }));
    group.add(new Konva.Text({ name: 'caption', listening: false, align: 'center', verticalAlign: 'middle', wrap: 'none', ellipsis: true }));
  },

  update(group, el, box, ctx) {
    const { w, h } = box;
    group.findOne('.hit').size({ width: w, height: h });
    const fg = ctx.color(el.fg, '#111111');
    const bg = ctx.color(el.bg, '#ffffff');
    const pad = el.card ? Math.min(w, h) * 0.07 : 0;
    const captionH = el.caption ? Math.max(16, Math.min(w, h) * 0.13) : 0;
    const size = Math.max(10, Math.min(w - pad * 2, h - pad * 2 - captionH));
    const cardW = size + pad * 2;
    const cardH = size + captionH + pad * 2;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;
    const codeX = cardX + pad;
    const codeY = cardY + pad;

    group.findOne('.card').setAttrs({
      visible: el.card,
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      fill: bg,
      cornerRadius: Math.min(el.cardRadius, cardW / 2, cardH / 2),
      shadowEnabled: true,
      shadowColor: 'rgba(0,0,0,0.35)',
      shadowBlur: size * 0.06,
      shadowOffset: { x: 0, y: size * 0.02 },
    });

    const error = qrValidationError(el.kind, el.data);
    const ecl = el.logoAssetId ? 'H' : el.ecl;
    const matrix = error ? null : cachedMatrix(buildQrPayload(el.kind, el.data), ecl);
    const code = group.findOne('.code');
    const placeholder = group.findOne('.placeholder');
    if (matrix) {
      code.setAttrs({
        visible: true,
        x: codeX,
        y: codeY,
        sceneFunc: (c) => drawCode(c, matrix, { size, margin: el.margin, style: el.moduleStyle, fg, bg }),
      });
      placeholder.visible(false);
    } else {
      code.visible(false);
      placeholder.setAttrs({
        visible: !ctx.exporting,
        x: codeX,
        y: codeY,
        width: size,
        height: size,
        padding: size * 0.08,
        text: error ?? 'Uzupełnij dane kodu QR',
        fontSize: Math.max(12, size * 0.08),
        fontFamily: ctx.font('body'),
        fill: '#888888',
      });
    }

    const logo = ctx.image(el.logoAssetId);
    const logoSize = size * 0.22;
    const logoPad = logoSize * 0.12;
    group.findOne('.logo-bg').setAttrs({
      visible: !!(logo && matrix),
      x: codeX + (size - logoSize) / 2 - logoPad,
      y: codeY + (size - logoSize) / 2 - logoPad,
      width: logoSize + logoPad * 2,
      height: logoSize + logoPad * 2,
      fill: bg,
      cornerRadius: logoPad * 1.5,
    });
    group.findOne('.logo').setAttrs({
      visible: !!(logo && matrix),
      image: logo,
      x: codeX + (size - logoSize) / 2,
      y: codeY + (size - logoSize) / 2,
      width: logoSize,
      height: logoSize,
    });

    group.findOne('.caption').setAttrs({
      visible: !!el.caption,
      x: cardX,
      y: codeY + size,
      width: cardW,
      height: captionH,
      text: el.caption,
      fontSize: captionH * 0.6,
      fontStyle: 'bold',
      fontFamily: ctx.font('body'),
      fill: el.card ? ctx.color(el.captionColor, '#111111') : ctx.color('palette:text'),
    });
  },
};
```

(Logo wymusza korekcję błędów `H` — kod pozostaje czytelny mimo zasłoniętego środka.)

- [ ] **Step 3: Utwórz `src/canvas/nodes/shape.js`**

```js
import Konva from 'konva';

export const shapeNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    group.add(new Konva.Rect({ name: 'rect', listening: false }));
    group.add(new Konva.Ellipse({ name: 'ellipse', listening: false }));
    group.add(new Konva.Line({ name: 'line', listening: false, lineCap: 'round' }));
  },

  update(group, el, box, ctx) {
    const { w, h } = box;
    group.findOne('.hit').size({ width: w, height: h });
    const fill = ctx.color(el.fill);
    const stroke = ctx.color(el.stroke);
    const strokeWidth = el.strokeWidth;
    const common = { fill, stroke, strokeWidth, strokeEnabled: strokeWidth > 0, opacity: el.opacity };
    group.findOne('.rect').setAttrs({
      ...common,
      visible: el.shape === 'rect',
      width: w,
      height: h,
      cornerRadius: Math.min(el.radius, w / 2, h / 2),
    });
    group.findOne('.ellipse').setAttrs({
      ...common,
      visible: el.shape === 'ellipse',
      x: w / 2,
      y: h / 2,
      radiusX: w / 2,
      radiusY: h / 2,
    });
    group.findOne('.line').setAttrs({
      visible: el.shape === 'line',
      points: [h / 2, h / 2, Math.max(h / 2, w - h / 2), h / 2],
      stroke: fill,
      strokeWidth: h,
      opacity: el.opacity,
    });
  },
};
```

(Grubość linii = wysokość ramki, więc linię pogrubia się zwykłym uchwytem.)

- [ ] **Step 4: Zastąp `src/canvas/nodes/index.js`**

```js
import { textNode } from './text.js';
import { photoNode } from './photo.js';
import { imageNode } from './image.js';
import { pointsNode } from './points.js';
import { qrNode } from './qr.js';
import { shapeNode } from './shape.js';

export const NODE_TYPES = {
  text: textNode,
  photo: photoNode,
  image: imageNode,
  points: pointsNode,
  qr: qrNode,
  shape: shapeNode,
};
```

- [ ] **Step 5: Sprawdź ręcznie**

Run: `npm start`
Expected:
- Plakat pokazuje wszystkie elementy domyślnego układu: zdjęcie po lewej, krótki pasek akcentu, tytuł, podtytuł, 4 punkty z niebieskimi kropkami, kod QR w białej karcie z podpisem „Zeskanuj mnie” i stopkę.
- Kod QR skanuje się telefonem (aparat) i otwiera `https://example.com`.
- Motyw „Nocny” ma styl QR `rounded` → moduły i narożne wzory pozycjonujące są zaokrąglone.
- Długi tekst w punktach (wpisz w `model.js` tymczasowo długie zdanie) zmniejsza czcionkę tak, by wszystko zmieściło się w ramce — cofnij tymczasową zmianę.

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/canvas/nodes
git commit -m "feat(canvas): punkty ze znacznikami i auto-dopasowaniem, wektorowy kod QR (style, logo, podpis), kształty"
```

---
### Task 15: Interakcja na płótnie — zaznaczanie, przeciąganie, uchwyty, przyciąganie, zoom, kadrowanie

**Files:**
- Create: `src/canvas/interaction.js`
- Modify: `src/renderer/main.js`

**Interfaces:**
- Consumes: `editor` (Zadanie 12: `stage`, `uiLayer`, `posterGroup`, `renderer.groupFor`, `renderer.liveUpdate`, `view`, `zoomBy`, `zoomAt`, `panBy`, `fit`, `setInteracting`, `on('rendered')`), `store`, `selection`, `settings` (`snap`, `showGrid`, `gridSize`, `showSafeArea`), `snapTargets`, `computeSnap`, `panCrop`, `shapeBounds`, `MIN_BOX`, `SAFE_AREA`, `toast`, `isTypingTarget`.
- Produces: `installInteraction(app)` rejestrujący akcje: `zoomIn()`, `zoomOut()`, `zoomFit()`, `zoom100()`, `toggleGrid()`, `toggleSafeArea()`, `toggleSnap()`, `enterCrop(id)`, `exitCrop()`.
  Zachowanie:
  - klik = zaznacz; Shift/Ctrl + klik = dodaj/usuń z zaznaczenia; klik w tło = odznacz; przeciągnięcie po tle = ramka zaznaczenia
  - przeciąganie elementu (wielu naraz), przyciąganie do krawędzi/środka płótna, obszaru bezpiecznego i innych elementów (Alt wyłącza), różowe linie pomocnicze
  - uchwyty: zmiana rozmiaru bez rozciągania treści (tekst przelicza się na żywo), obrót z przyciąganiem co 45°; QR i zdjęcie-koło zachowują proporcje; linia ma tylko uchwyty boczne
  - Ctrl + kółko = zoom w miejscu kursora; kółko = przewijanie; środkowy przycisk lub Spacja + przeciąganie = przesuwanie widoku
  - dwuklik: zdjęcie z obrazem → tryb kadrowania (przeciąganie przesuwa kadr, kółko zmienia zoom 1–5×, Enter/Esc/klik obok kończy); puste zdjęcie/obraz → wybór pliku; inne → `app.actions.focusElementField?.(id)`
  - siatka i obszar bezpieczny rysowane na warstwie UI (nie trafiają do eksportu)

- [ ] **Step 1: Utwórz `src/canvas/interaction.js`**

```js
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
      for (const node of nodes) {
        const b = d.boxes[d.orientation][node.id()];
        if (!b) continue;
        b.x = Math.round(node.x());
        b.y = Math.round(node.y());
        b.w = Math.max(MIN_BOX, Math.round(node.getAttr('boxW')));
        b.h = Math.max(MIN_BOX, Math.round(node.getAttr('boxH')));
        b.rotation = Math.round(node.rotation() * 10) / 10;
      }
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
```

- [ ] **Step 2: Podłącz moduł w `src/renderer/main.js`**

Dodaj import pod `import { installImages } from './images.js';`:
```js
import { installInteraction } from '../canvas/interaction.js';
```
Zmień `const FEATURES = [installImages];` na:
```js
const FEATURES = [installImages, installInteraction];
```

- [ ] **Step 3: Sprawdź ręcznie**

Run: `npm start`
Expected (lista kontrolna):
- Klik w tytuł pokazuje niebieską ramkę z uchwytami; klik w tło odznacza.
- Przeciąganie tytułu: przy środku płótna pojawia się różowa linia i element „przykleja się”; z wciśniętym Alt — bez przyciągania.
- Ciągnięcie prawego uchwytu tytułu zawęża ramkę, a tekst zawija się i zmniejsza na żywo (nie rozciąga się).
- Obrót górnym uchwytem przeskakuje co 45°.
- Ramka zaznaczenia przeciągnięta po tle zaznacza kilka elementów; przeciągnięcie jednego przesuwa wszystkie.
- Ctrl + kółko przybliża w miejscu kursora; środkowy przycisk lub Spacja + lewy przycisk przesuwa widok.
- Dwuklik na zdjęciu (z obrazem) → pomarańczowa przerywana ramka; przeciąganie przesuwa kadr, kółko przybliża, Esc kończy.
- Po zmianie rozmiaru okna widok ponownie się dopasowuje.

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/canvas/interaction.js src/renderer/main.js
git commit -m "feat(canvas): zaznaczanie, przeciąganie z przyciąganiem, uchwyty, obrót, zoom/przesuwanie i kadrowanie zdjęcia"
```

---
### Task 16: Polecenia edycji i skróty klawiszowe

**Files:**
- Create: `src/core/keys.js`, `src/renderer/commands.js`, `src/ui/shortcuts.js`
- Modify: `src/renderer/main.js`
- Test: `tests/core/keys.test.js`

**Interfaces:**
- Consumes: `duplicateElements`, `deleteElements`, `reorder`, `nudge`, `toggleHidden`, `setLocked`, `addElement` (elementOps), `alignBoxes`, `distributeBoxes` (align), `toast`, `openModal` (dialogs), `h`, `isTypingTarget` (dom).
- Produces:
  - `keys.js`: `keyName(e): string`, `comboFromEvent(e): string` (kolejność: `Ctrl+Alt+Shift+Klawisz`)
  - `commands.js`: `installCommands(app)` → akcje `undo`, `redo`, `deleteSelection`, `duplicateSelection`, `selectAll`, `deselect`, `nudgeSelection(dx, dy)`, `reorderSelection(mode)`, `toggleLockSelection`, `toggleHiddenSelection`, `setOrientation(o)`, `toggleOrientation`, `addText`, `addShape(kind)`, `addQr`, `alignSelection(mode)`, `distributeSelection(axis)`
  - `shortcuts.js`: `SHORTCUTS: { keys, action, args?, label?, global?, hidden? }[]`, `installShortcuts(app)` (rejestruje też akcję `showShortcuts` — okno F1)

- [ ] **Step 1: Napisz testy klawiszy**

`tests/core/keys.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { comboFromEvent, keyName } from '../../src/core/keys.js';

const ev = (o) => ({ ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, key: '', code: '', ...o });

describe('comboFromEvent', () => {
  it('litery i cyfry niezależnie od układu klawiatury', () => {
    expect(comboFromEvent(ev({ code: 'KeyS', key: 's', ctrlKey: true }))).toBe('Ctrl+S');
    expect(comboFromEvent(ev({ code: 'KeyS', key: 'S', ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+S');
    expect(comboFromEvent(ev({ code: 'Digit1', key: '1', ctrlKey: true }))).toBe('Ctrl+1');
    expect(comboFromEvent(ev({ code: 'KeyZ', key: 'z', metaKey: true }))).toBe('Ctrl+Z');
  });
  it('nawiasy, plus i minus', () => {
    expect(comboFromEvent(ev({ code: 'BracketRight', key: '}', ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+]');
    expect(comboFromEvent(ev({ code: 'NumpadAdd', key: '+', ctrlKey: true }))).toBe('Ctrl+=');
    expect(comboFromEvent(ev({ code: 'Minus', key: '-', ctrlKey: true }))).toBe('Ctrl+-');
  });
  it('klawisze specjalne', () => {
    expect(comboFromEvent(ev({ code: 'ArrowLeft', key: 'ArrowLeft', shiftKey: true }))).toBe('Shift+ArrowLeft');
    expect(comboFromEvent(ev({ code: 'Delete', key: 'Delete' }))).toBe('Delete');
    expect(comboFromEvent(ev({ code: 'F5', key: 'F5' }))).toBe('F5');
    expect(keyName(ev({ code: 'Space', key: ' ' }))).toBe('Space');
  });
  it('AltGr (polskie znaki) daje kombinację z Alt, której nie używamy', () => {
    expect(comboFromEvent(ev({ code: 'KeyA', key: 'ą', ctrlKey: true, altKey: true }))).toBe('Ctrl+Alt+A');
  });
});
```

- [ ] **Step 2: Uruchom — ma nie przejść**

Run: `npx vitest run tests/core/keys.test.js`
Expected: FAIL — brak `keys.js`.

- [ ] **Step 3: Zaimplementuj `src/core/keys.js`**

```js
const CODE_KEYS = {
  BracketLeft: '[', BracketRight: ']', Equal: '=', Minus: '-', NumpadAdd: '=', NumpadSubtract: '-',
  Semicolon: ';', Quote: "'", Slash: '/', Backslash: '\\', Comma: ',', Period: '.', Backquote: '`',
};

export function keyName(e) {
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3);
  if (/^Digit\d$/.test(e.code)) return e.code.slice(5);
  if (/^Numpad\d$/.test(e.code)) return e.code.slice(6);
  if (CODE_KEYS[e.code]) return CODE_KEYS[e.code];
  if (e.key === ' ' || e.code === 'Space') return 'Space';
  if (e.key && e.key.length === 1) return e.key.toUpperCase();
  return e.key;
}

export function comboFromEvent(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(keyName(e));
  return parts.join('+');
}
```

- [ ] **Step 4: Uruchom — ma przejść**

Run: `npx vitest run tests/core/keys.test.js`
Expected: PASS.

- [ ] **Step 5: Utwórz `src/renderer/commands.js`**

```js
import {
  duplicateElements, deleteElements, reorder, nudge, toggleHidden, setLocked, addElement,
} from '../core/elementOps.js';
import { alignBoxes, distributeBoxes } from '../core/align.js';
import { toast } from '../ui/dialogs.js';

const plural = (n, one, few, many) => {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
};

export function installCommands(app) {
  const { store, selection } = app;
  const selected = () => selection.ids.filter((id) => store.doc.elements[id]);

  function add(type, overrides = {}) {
    let id;
    store.update((doc) => {
      id = addElement(doc, type, { overrides });
    });
    selection.set([id]);
  }

  Object.assign(app.actions, {
    undo() {
      if (!store.undo()) toast('Nie ma czego cofnąć.');
    },
    redo() {
      if (!store.redo()) toast('Nie ma czego ponowić.');
    },
    deleteSelection() {
      const ids = selected();
      if (!ids.length) return;
      store.update((doc) => {
        deleteElements(doc, ids);
      });
      selection.clear();
      toast(`Usunięto ${ids.length} ${plural(ids.length, 'element', 'elementy', 'elementów')} (Ctrl+Z cofa).`);
    },
    duplicateSelection() {
      const ids = selected();
      if (!ids.length) return;
      let created = [];
      store.update((doc) => {
        created = duplicateElements(doc, ids);
      });
      selection.set(created);
    },
    selectAll() {
      const doc = store.doc;
      selection.set(doc.order.filter((id) => !doc.elements[id].locked && !doc.boxes[doc.orientation][id]?.hidden));
    },
    deselect() {
      if (selection.cropId) selection.setCrop(null);
      else selection.clear();
    },
    nudgeSelection(dx, dy) {
      const ids = selected();
      if (!ids.length) return;
      store.update((doc) => nudge(doc, ids, dx, dy) || false, { key: 'nudge' });
    },
    reorderSelection(mode) {
      const ids = selected();
      if (!ids.length) return;
      store.update((doc) => reorder(doc, ids, mode) || false);
    },
    toggleLockSelection() {
      const ids = selected();
      if (!ids.length) return;
      const lock = ids.some((id) => !store.doc.elements[id].locked);
      store.update((doc) => {
        setLocked(doc, ids, lock);
      });
      toast(lock ? 'Zablokowano — element nie będzie się przesuwał.' : 'Odblokowano.');
    },
    toggleHiddenSelection() {
      const ids = selected();
      if (!ids.length) return;
      store.update((doc) => {
        toggleHidden(doc, ids);
      });
    },
    setOrientation(orientation) {
      if (store.doc.orientation === orientation) return;
      selection.setCrop(null);
      store.update((doc) => {
        doc.orientation = orientation;
      }, { history: false, reason: 'orientation' });
    },
    toggleOrientation() {
      app.actions.setOrientation(store.doc.orientation === 'landscape' ? 'portrait' : 'landscape');
    },
    addText: () => add('text', { text: 'Nowy tekst', size: 64 }),
    addShape: (kind = 'rect') => add('shape', { shape: kind }),
    addQr: () => add('qr'),
    alignSelection(mode) {
      const ids = selected();
      if (!ids.length) return;
      const doc = store.doc;
      const f = doc.formats[doc.orientation];
      const boxes = ids.map((id) => ({ id, ...doc.boxes[doc.orientation][id] }));
      const placed = alignBoxes(boxes, mode, ids.length === 1 ? { x: 0, y: 0, w: f.w, h: f.h } : null);
      store.update((d) => {
        for (const p of placed) {
          if (d.elements[p.id].locked) continue;
          Object.assign(d.boxes[d.orientation][p.id], { x: p.x, y: p.y });
        }
      });
    },
    distributeSelection(axis) {
      const ids = selected();
      if (ids.length < 3) {
        toast('Zaznacz co najmniej 3 elementy, aby rozłożyć je równomiernie.');
        return;
      }
      const doc = store.doc;
      const placed = distributeBoxes(ids.map((id) => ({ id, ...doc.boxes[doc.orientation][id] })), axis);
      store.update((d) => {
        for (const p of placed) {
          if (d.elements[p.id].locked) continue;
          Object.assign(d.boxes[d.orientation][p.id], { x: p.x, y: p.y });
        }
      });
    },
  });
}
```

- [ ] **Step 6: Utwórz `src/ui/shortcuts.js`**

```js
import { comboFromEvent } from '../core/keys.js';
import { isTypingTarget, h } from './dom.js';
import { openModal } from './dialogs.js';

export const SHORTCUTS = [
  { keys: 'Ctrl+N', action: 'newProject', label: 'Nowy projekt', global: true },
  { keys: 'Ctrl+O', action: 'openProject', label: 'Otwórz projekt', global: true },
  { keys: 'Ctrl+S', action: 'saveProject', label: 'Zapisz', global: true },
  { keys: 'Ctrl+Shift+S', action: 'saveProjectAs', label: 'Zapisz jako…', global: true },
  { keys: 'Ctrl+E', action: 'openExport', label: 'Eksport (PNG / JPG / PDF)', global: true },
  { keys: 'F5', action: 'present', label: 'Pokaz pełnoekranowy', global: true },
  { keys: 'Ctrl+Z', action: 'undo', label: 'Cofnij' },
  { keys: 'Ctrl+Y', action: 'redo', label: 'Ponów' },
  { keys: 'Ctrl+Shift+Z', action: 'redo', hidden: true },
  { keys: 'Ctrl+D', action: 'duplicateSelection', label: 'Duplikuj zaznaczone' },
  { keys: 'Delete', action: 'deleteSelection', label: 'Usuń zaznaczone' },
  { keys: 'Backspace', action: 'deleteSelection', hidden: true },
  { keys: 'Ctrl+A', action: 'selectAll', label: 'Zaznacz wszystko' },
  { keys: 'Escape', action: 'deselect', label: 'Odznacz / zakończ kadrowanie' },
  { keys: 'ArrowLeft', action: 'nudgeSelection', args: [-1, 0], label: 'Przesuń o 1 px (Shift: 10 px)' },
  { keys: 'ArrowRight', action: 'nudgeSelection', args: [1, 0], hidden: true },
  { keys: 'ArrowUp', action: 'nudgeSelection', args: [0, -1], hidden: true },
  { keys: 'ArrowDown', action: 'nudgeSelection', args: [0, 1], hidden: true },
  { keys: 'Shift+ArrowLeft', action: 'nudgeSelection', args: [-10, 0], hidden: true },
  { keys: 'Shift+ArrowRight', action: 'nudgeSelection', args: [10, 0], hidden: true },
  { keys: 'Shift+ArrowUp', action: 'nudgeSelection', args: [0, -10], hidden: true },
  { keys: 'Shift+ArrowDown', action: 'nudgeSelection', args: [0, 10], hidden: true },
  { keys: 'Ctrl+]', action: 'reorderSelection', args: ['forward'], label: 'Warstwa wyżej' },
  { keys: 'Ctrl+[', action: 'reorderSelection', args: ['backward'], label: 'Warstwa niżej' },
  { keys: 'Ctrl+Shift+]', action: 'reorderSelection', args: ['front'], label: 'Na wierzch' },
  { keys: 'Ctrl+Shift+[', action: 'reorderSelection', args: ['back'], label: 'Na spód' },
  { keys: 'Ctrl+L', action: 'toggleLockSelection', label: 'Zablokuj / odblokuj' },
  { keys: 'Ctrl+H', action: 'toggleHiddenSelection', label: 'Ukryj / pokaż w tej orientacji' },
  { keys: 'Ctrl+1', action: 'setOrientation', args: ['landscape'], label: 'Orientacja pozioma' },
  { keys: 'Ctrl+2', action: 'setOrientation', args: ['portrait'], label: 'Orientacja pionowa' },
  { keys: 'Ctrl+0', action: 'zoomFit', label: 'Dopasuj widok' },
  { keys: 'Ctrl+=', action: 'zoomIn', label: 'Powiększ' },
  { keys: 'Ctrl+Shift+=', action: 'zoomIn', hidden: true },
  { keys: 'Ctrl+-', action: 'zoomOut', label: 'Pomniejsz' },
  { keys: 'Ctrl+G', action: 'toggleGrid', label: 'Siatka' },
  { keys: 'Ctrl+Shift+G', action: 'toggleSafeArea', label: 'Obszar bezpieczny TV' },
  { keys: 'Ctrl+Shift+P', action: 'toggleSnap', label: 'Przyciąganie wł./wył.' },
  { keys: 'T', action: 'addText', label: 'Dodaj tekst' },
  { keys: 'R', action: 'addShape', args: ['rect'], label: 'Dodaj prostokąt' },
  { keys: 'F1', action: 'showShortcuts', label: 'Ta pomoc', global: true },
];

const EXTRA_HELP = [
  ['Ctrl + kółko myszy', 'Przybliżanie w miejscu kursora'],
  ['Spacja + przeciąganie / środkowy przycisk', 'Przesuwanie widoku'],
  ['Shift / Ctrl + klik', 'Dodaj lub usuń z zaznaczenia'],
  ['Alt podczas przeciągania', 'Bez przyciągania'],
  ['Dwuklik na zdjęciu', 'Kadrowanie (kółko = zoom)'],
  ['Alt + upuszczenie pliku', 'Wstaw jako nowy obraz'],
  ['Ctrl + V', 'Wklej obraz ze schowka'],
];

const prettyKeys = (keys) => keys.replace('ArrowLeft', 'Strzałki').replace('Escape', 'Esc').replace(/\+/g, ' + ');

function showShortcuts() {
  const rows = [
    ...SHORTCUTS.filter((s) => !s.hidden).map((s) => [prettyKeys(s.keys), s.label]),
    ...EXTRA_HELP,
  ];
  openModal({
    title: 'Skróty klawiszowe',
    body: h('table', { class: 'shortcut-table' },
      rows.map(([keys, label]) => h('tr', {}, h('td', {}, h('span', { class: 'kbd' }, keys)), h('td', {}, label)))),
    actions: [{ id: 'ok', label: 'Zamknij', kind: 'primary' }],
  });
}

export function installShortcuts(app) {
  app.actions.showShortcuts = showShortcuts;
  const map = new Map(SHORTCUTS.map((s) => [s.keys, s]));
  window.addEventListener('keydown', (e) => {
    if (document.querySelector('.modal-backdrop')) return;
    const shortcut = map.get(comboFromEvent(e));
    if (!shortcut) return;
    if (isTypingTarget(e.target) && !shortcut.global) return;
    const fn = app.actions[shortcut.action];
    if (!fn) return;
    e.preventDefault();
    Promise.resolve()
      .then(() => fn(...(shortcut.args ?? [])))
      .catch((err) => console.error(`Błąd akcji ${shortcut.action}:`, err));
  });
}
```

- [ ] **Step 7: Podłącz moduły w `src/renderer/main.js`**

Dodaj importy pod `import { installInteraction } from '../canvas/interaction.js';`:
```js
import { installCommands } from './commands.js';
import { installShortcuts } from '../ui/shortcuts.js';
```
Zmień `const FEATURES = [installImages, installInteraction];` na:
```js
const FEATURES = [installImages, installInteraction, installCommands, installShortcuts];
```

- [ ] **Step 8: Sprawdź ręcznie**

Run: `npm start`
Expected:
- Zaznacz tytuł → strzałki przesuwają o 1 px, Shift+strzałka o 10 px; Ctrl+Z cofa całą serię przesunięć jednym krokiem (scalanie).
- Ctrl+D tworzy kopię przesuniętą o 24 px; Delete usuwa i pokazuje komunikat; Ctrl+Z przywraca.
- Ctrl+2 przełącza na pion (plakat 1080×1920 z układem pionowym), Ctrl+1 wraca.
- T dodaje „Nowy tekst” na środku; R dodaje prostokąt.
- Ctrl+L blokuje (uchwyty znikają, kursor „zakaz”).
- F1 pokazuje tabelę skrótów; Esc ją zamyka.

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/core/keys.js src/renderer/commands.js src/ui/shortcuts.js src/renderer/main.js tests/core/keys.test.js
git commit -m "feat: polecenia edycji (warstwy, wyrównanie, blokady, orientacja) i skróty klawiszowe z pomocą F1"
```

---
### Task 17: Szkielet interfejsu — kontrolki, bindingi, pasek narzędzi, pasek stanu, zakładki, panel „Treść”

**Files:**
- Create: `src/ui/controls.js`, `src/ui/binder.js`, `src/ui/toolbar.js`, `src/ui/statusbar.js`, `src/ui/sidebar.js`, `src/ui/panels/common.js`, `src/ui/panels/content.js`, `src/ui/index.js`
- Modify: `src/renderer/main.js`

**Interfaces:**
- Consumes: `h`, `clear` (dom), `PALETTE_KEYS`, `PALETTE_LABELS`, `MAX_POINTS` (constants), `normalizeHex` (colors), `resolveColor` (model), `addRecentColor` (settings), `findByRole`, `restoreRole` (document), `QR_KINDS`, `QR_FIELDS`, `qrValidationError` (qr), akcje z Zadań 13–16.
- Produces:
  - Kontrakt kontrolki: `{ el: HTMLElement, set(value, doc), onChange(fn), onCommit?(fn) }`
  - `controls.js`: `textField({ label, multiline, placeholder, maxLength, type, testId, rows })` (+ `input`), `slider({ label, min, max, step, unit, format, testId })`, `numberField({ label, min, max, step, testId })`, `selectField({ label, options: { value, label, group? }[], testId })`, `toggleField({ label, testId })`, `segmented({ label, options: { value, label, title? }[], testId })`, `colorField({ label, settings, allowPalette, testId })`, `button(label, onClick, { kind, small, title, testId, disabled })`, `section(title, children, { open = true })`
  - `binder.js`: `createBinder(store)` → `{ bind(control, { get(doc), set(doc, value) → void|false, key?, history? }), watch(fn(doc)), scope() → { bind, watch, dispose() } }`
  - Kontrakt panelu: `{ id, label, key(doc, selection): string, render(root, { app, binder }) }` — panel jest przebudowywany, gdy zmieni się `key`
  - `sidebar.js`: `installSidebar(app, panels)` → `app.ui.showTab(id)`, `app.ui.focusAfterRender = selector` (fokus po przebudowie)
  - `statusbar.js`: `installStatusbar(app)` → `app.ui.status.set(slot, text)` (sloty: `format`, `zoom`, `selection`, `dirty`, `autosave`, `info`)
  - `toolbar.js`: `installToolbar(app)` — menu „Plik ▾” i „+ Dodaj ▾” oraz przyciski; pokazuje tylko akcje, które istnieją (`data-testid`: `menu-file`, `menu-add`, `menu-<akcja>`, `btn-save`, `btn-undo`, `btn-redo`, `btn-present`, `btn-export`, `orientation-*`)
  - `panels/common.js`: `elProp(id, key)` (gotowy `{ get, set, key }` dla właściwości elementu), `visibilityToggle(binder, id)`, `restoreBox(app, role, title)`, `pointsEditor(app, binder, id): Node[]`, `qrDataEditor(app, binder, id): Node[]`
  - `ui/index.js`: `PANELS` (lista paneli), `installUI(app)`; `app.ui.binder`

- [ ] **Step 1: Utwórz `src/ui/controls.js`**

```js
import { h } from './dom.js';
import { PALETTE_KEYS, PALETTE_LABELS } from '../core/constants.js';
import { normalizeHex } from '../core/colors.js';
import { resolveColor } from '../core/model.js';
import { addRecentColor } from '../core/settings.js';

function emitter() {
  const fns = [];
  return { on: (fn) => fns.push(fn), emit: (...args) => fns.forEach((fn) => fn(...args)) };
}

const isFocused = (el) => document.activeElement === el;

export function textField({ label, multiline = false, placeholder = '', maxLength = 500, type = 'text', testId, rows = 2 } = {}) {
  const input = multiline
    ? h('textarea', { placeholder, maxlength: maxLength, rows, 'data-testid': testId })
    : h('input', { type, placeholder, maxlength: maxLength, 'data-testid': testId, spellcheck: 'true' });
  const change = emitter();
  const commit = emitter();
  input.addEventListener('input', () => change.emit(input.value));
  input.addEventListener('change', () => commit.emit());
  return {
    el: h('div', { class: 'field' }, label ? h('label', {}, label) : null, input),
    input,
    set(value) {
      const s = value ?? '';
      if (!isFocused(input) && input.value !== s) input.value = s;
    },
    onChange: change.on,
    onCommit: commit.on,
  };
}

export function slider({ label, min, max, step = 1, unit = '', format = (v) => v, testId } = {}) {
  const input = h('input', { type: 'range', min, max, step, 'data-testid': testId });
  const out = h('span', { class: 'slider-value' });
  const change = emitter();
  const commit = emitter();
  let dragging = false;
  const show = () => {
    out.textContent = `${format(Number(input.value))}${unit}`;
  };
  input.addEventListener('pointerdown', () => { dragging = true; });
  window.addEventListener('pointerup', () => { dragging = false; });
  input.addEventListener('input', () => {
    show();
    change.emit(Number(input.value));
  });
  input.addEventListener('change', () => commit.emit());
  return {
    el: h('div', { class: 'field' }, h('label', {}, h('span', {}, label), out), input),
    input,
    set(value) {
      if (dragging) return;
      input.value = String(value);
      show();
    },
    onChange: change.on,
    onCommit: commit.on,
  };
}

export function numberField({ label, min = -100000, max = 100000, step = 1, testId } = {}) {
  const input = h('input', { type: 'number', min, max, step, 'data-testid': testId });
  const change = emitter();
  const emit = () => {
    const v = Number(input.value);
    if (input.value !== '' && Number.isFinite(v)) change.emit(Math.min(max, Math.max(min, v)));
  };
  input.addEventListener('change', emit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') emit();
  });
  return {
    el: h('div', { class: 'field' }, label ? h('label', {}, label) : null, input),
    input,
    set(value) {
      if (!isFocused(input)) input.value = String(Math.round(Number(value) * 10) / 10);
    },
    onChange: change.on,
  };
}

export function selectField({ label, options, testId } = {}) {
  const select = h('select', { 'data-testid': testId });
  const groups = new Map();
  for (const o of options) {
    const opt = h('option', { value: String(o.value), style: o.style }, o.label);
    if (o.group) {
      if (!groups.has(o.group)) {
        const g = h('optgroup', { label: o.group });
        groups.set(o.group, g);
        select.append(g);
      }
      groups.get(o.group).append(opt);
    } else {
      select.append(opt);
    }
  }
  const change = emitter();
  select.addEventListener('change', () => change.emit(select.value));
  return {
    el: h('div', { class: 'field' }, label ? h('label', {}, label) : null, select),
    input: select,
    set(value) {
      if (value !== undefined && value !== null) select.value = String(value);
    },
    onChange: change.on,
  };
}

export function toggleField({ label, testId } = {}) {
  const input = h('input', { type: 'checkbox', 'data-testid': testId });
  const change = emitter();
  input.addEventListener('change', () => change.emit(input.checked));
  return {
    el: h('label', { class: 'toggle' }, input, h('span', {}, label)),
    input,
    set(value) {
      input.checked = !!value;
    },
    onChange: change.on,
  };
}

export function segmented({ label, options, testId } = {}) {
  const change = emitter();
  const buttons = options.map((o) =>
    h('button', {
      type: 'button',
      title: o.title ?? o.label,
      'data-value': String(o.value),
      'data-testid': testId ? `${testId}-${o.value}` : undefined,
      onClick: () => change.emit(o.value),
    }, o.label));
  return {
    el: h('div', { class: 'field' }, label ? h('label', {}, label) : null, h('div', { class: 'seg' }, buttons)),
    set(value) {
      for (const b of buttons) b.classList.toggle('active', b.dataset.value === String(value));
    },
    onChange: change.on,
  };
}

export function colorField({ label, settings = null, allowPalette = true, testId } = {}) {
  const change = emitter();
  const commit = emitter();
  let current = null;
  let palette = {};
  const paletteRow = h('div', { class: 'swatches' });
  const recentRow = h('div', { class: 'swatches' });
  const native = h('input', { type: 'color', class: 'color-native', title: 'Własny kolor', 'data-testid': testId });

  const remember = (hex) => {
    if (settings && hex?.startsWith('#')) settings.set({ recentColors: addRecentColor(settings.get('recentColors'), hex) });
  };
  const pick = (value, isNew) => {
    if (!value) return;
    current = value;
    change.emit(value);
    commit.emit();
    if (isNew) remember(value);
    draw();
  };

  const eyedropper = window.EyeDropper
    ? h('button', {
      type: 'button',
      class: 'btn small icon',
      title: 'Pobierz kolor z ekranu (pipeta)',
      onClick: async () => {
        try {
          const { sRGBHex } = await new window.EyeDropper().open();
          pick(normalizeHex(sRGBHex), true);
        } catch {
          /* anulowano */
        }
      },
    }, '⌖')
    : null;

  native.addEventListener('input', () => {
    current = native.value;
    change.emit(native.value);
  });
  native.addEventListener('change', () => {
    commit.emit();
    remember(native.value);
    draw();
  });

  function draw() {
    paletteRow.replaceChildren(...(allowPalette ? PALETTE_KEYS.map((k) => {
      const value = `palette:${k}`;
      return h('button', {
        type: 'button',
        class: `swatch${current === value ? ' active' : ''}`,
        title: `${PALETTE_LABELS[k]} (kolor motywu)`,
        style: { background: palette[k] ?? '#000' },
        onClick: () => pick(value, false),
      });
    }) : []));
    const recent = settings?.get('recentColors') ?? [];
    recentRow.replaceChildren(...recent.map((c) =>
      h('button', { type: 'button', class: `swatch${current === c ? ' active' : ''}`, title: c, style: { background: c }, onClick: () => pick(c, false) })));
  }

  return {
    el: h('div', { class: 'field' },
      label ? h('label', {}, label) : null,
      h('div', { class: 'color-control' }, paletteRow, native, eyedropper),
      recentRow),
    set(value, doc) {
      current = value;
      if (doc) palette = doc.palette;
      const hex = doc ? resolveColor(doc, value) : normalizeHex(value);
      if (hex && !isFocused(native)) native.value = hex;
      draw();
    },
    onChange: change.on,
    onCommit: commit.on,
  };
}

export function button(label, onClick, { kind = '', small = false, title, testId, disabled = false } = {}) {
  return h('button', {
    type: 'button',
    class: `btn ${kind} ${small ? 'small' : ''}`.trim(),
    title,
    'data-testid': testId,
    disabled,
    onClick,
  }, label);
}

export function section(title, children, { open = true } = {}) {
  return h('details', { class: 'section', open }, h('summary', {}, title), children);
}
```

- [ ] **Step 2: Utwórz `src/ui/binder.js`**

```js
export function createBinder(store) {
  const syncs = new Set();

  store.subscribe((doc) => {
    for (const sync of [...syncs]) sync(doc);
  });

  function watch(fn) {
    const sync = (doc) => {
      try {
        fn(doc);
      } catch (err) {
        console.warn('Błąd odświeżania kontrolki:', err);
      }
    };
    syncs.add(sync);
    sync(store.doc);
    return () => syncs.delete(sync);
  }

  function bind(control, { get, set, key = null, history = true }) {
    control.onChange((value) => store.update((doc) => set(doc, value), { key, history }));
    control.onCommit?.(() => store.breakCoalescing());
    return watch((doc) => control.set(get(doc), doc));
  }

  function scope() {
    const owned = [];
    return {
      bind: (control, opts) => {
        owned.push(bind(control, opts));
      },
      watch: (fn) => {
        owned.push(watch(fn));
      },
      dispose() {
        owned.forEach((off) => off());
        owned.length = 0;
      },
    };
  }

  return { bind, watch, scope };
}
```

- [ ] **Step 3: Utwórz `src/ui/toolbar.js`**

```js
import { h, clear } from './dom.js';

const FILE_MENU = [
  { action: 'newProject', label: 'Nowy projekt…', keys: 'Ctrl+N' },
  { action: 'openProject', label: 'Otwórz…', keys: 'Ctrl+O' },
  { action: 'openRecent', label: 'Ostatnie projekty…' },
  'sep',
  { action: 'saveProject', label: 'Zapisz', keys: 'Ctrl+S' },
  { action: 'saveProjectAs', label: 'Zapisz jako…', keys: 'Ctrl+Shift+S' },
  { action: 'saveAsTemplate', label: 'Zapisz jako szablon…' },
  'sep',
  { action: 'openExport', label: 'Eksportuj…', keys: 'Ctrl+E' },
  { action: 'copyToClipboard', label: 'Kopiuj plakat do schowka' },
];

const ADD_MENU = [
  { action: 'addText', label: 'Tekst', keys: 'T' },
  { action: 'addImageElement', label: 'Obraz (np. logo)…' },
  { action: 'addShape', args: ['rect'], label: 'Prostokąt', keys: 'R' },
  { action: 'addShape', args: ['ellipse'], label: 'Elipsa' },
  { action: 'addShape', args: ['line'], label: 'Linia' },
  { action: 'addQr', label: 'Kod QR' },
];

const sep = () => h('div', { class: 'toolbar-sep' });

function run(app, action, args = []) {
  Promise.resolve()
    .then(() => app.actions[action]?.(...args))
    .catch((err) => console.error(`Błąd akcji ${action}:`, err));
}

function menuButton(app, label, items, testId) {
  const available = items.filter((it) => it === 'sep' || app.actions[it.action]);
  const cleaned = available.filter((it, i, arr) => it !== 'sep' || (i > 0 && i < arr.length - 1 && arr[i - 1] !== 'sep'));
  if (!cleaned.some((it) => it !== 'sep')) return null;

  const close = () => {
    menu.hidden = true;
  };
  const menu = h('div', { class: 'menu', role: 'menu', hidden: true }, cleaned.map((it) =>
    it === 'sep'
      ? h('div', { class: 'menu-sep' })
      : h('button', {
        type: 'button',
        class: 'menu-item',
        role: 'menuitem',
        'data-testid': `menu-${it.action}${it.args ? `-${it.args.join('-')}` : ''}`,
        onClick: () => {
          close();
          run(app, it.action, it.args);
        },
      }, h('span', {}, it.label), it.keys ? h('span', { class: 'menu-keys' }, it.keys) : null)));
  const button = h('button', {
    type: 'button',
    class: 'btn',
    'data-testid': testId,
    'aria-haspopup': 'menu',
    onClick: (e) => {
      e.stopPropagation();
      const wasHidden = menu.hidden;
      document.dispatchEvent(new Event('menus:close'));
      menu.hidden = !wasHidden;
    },
  }, `${label} ▾`);
  const wrap = h('div', { class: 'menu-wrap' }, button, menu);
  document.addEventListener('menus:close', close);
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  return wrap;
}

function actionButton(app, { action, args, label, title, kind = '', icon = false, testId }) {
  if (!app.actions[action]) return null;
  return h('button', {
    type: 'button',
    class: `btn ${kind} ${icon ? 'icon' : ''}`.trim(),
    title,
    'data-testid': testId,
    onClick: () => run(app, action, args),
  }, label);
}

function orientationGroup(app) {
  const make = (value, label, title) =>
    h('button', { type: 'button', title, 'data-testid': `orientation-${value}`, onClick: () => run(app, 'setOrientation', [value]) }, label);
  const landscape = make('landscape', '▭ Poziomo', 'Orientacja pozioma (Ctrl+1)');
  const portrait = make('portrait', '▯ Pionowo', 'Orientacja pionowa (Ctrl+2)');
  const refresh = () => {
    landscape.classList.toggle('active', app.store.doc.orientation === 'landscape');
    portrait.classList.toggle('active', app.store.doc.orientation === 'portrait');
  };
  app.store.subscribe(refresh);
  refresh();
  return h('div', { class: 'seg' }, landscape, portrait);
}

function zoomGroup(app) {
  const label = h('button', { type: 'button', class: 'btn ghost', title: 'Dopasuj do okna (Ctrl+0)', onClick: () => run(app, 'zoomFit') }, '100%');
  app.editor.on('view', (view) => {
    label.textContent = `${Math.round(view.scale * 100)}%`;
  });
  return h('div', { class: 'toolbar-group' },
    h('button', { type: 'button', class: 'btn icon', title: 'Pomniejsz (Ctrl+-)', onClick: () => run(app, 'zoomOut') }, '−'),
    label,
    h('button', { type: 'button', class: 'btn icon', title: 'Powiększ (Ctrl+=)', onClick: () => run(app, 'zoomIn') }, '+'));
}

export function installToolbar(app) {
  const root = document.getElementById('toolbar');
  const undo = actionButton(app, { action: 'undo', label: '↶', title: 'Cofnij (Ctrl+Z)', icon: true, testId: 'btn-undo' });
  const redo = actionButton(app, { action: 'redo', label: '↷', title: 'Ponów (Ctrl+Y)', icon: true, testId: 'btn-redo' });
  const parts = [
    h('div', { class: 'toolbar-group' },
      menuButton(app, 'Plik', FILE_MENU, 'menu-file'),
      actionButton(app, { action: 'saveProject', label: 'Zapisz', title: 'Zapisz (Ctrl+S)', testId: 'btn-save' })),
    sep(),
    h('div', { class: 'toolbar-group' }, undo, redo),
    sep(),
    orientationGroup(app),
    sep(),
    menuButton(app, '+ Dodaj', ADD_MENU, 'menu-add'),
    h('div', { class: 'spacer' }),
    zoomGroup(app),
    sep(),
    h('div', { class: 'toolbar-group' },
      actionButton(app, { action: 'showShortcuts', label: '?', title: 'Skróty klawiszowe (F1)', icon: true }),
      actionButton(app, { action: 'present', label: '▶ Pokaz', title: 'Pokaz pełnoekranowy (F5)', testId: 'btn-present' }),
      actionButton(app, { action: 'openExport', label: 'Eksportuj', title: 'Eksport PNG / JPG / PDF (Ctrl+E)', kind: 'primary', testId: 'btn-export' })),
  ];
  clear(root).append(...parts.filter(Boolean));
  const refresh = () => {
    if (undo) undo.disabled = !app.store.canUndo();
    if (redo) redo.disabled = !app.store.canRedo();
  };
  app.store.subscribe(refresh);
  refresh();
}
```

Pasek ma dwa rozwijane menu („Plik ▾”, „+ Dodaj ▾”), żeby zmieścić się w oknie od 1100 px. Pozycje menu i przyciski pokazują się tylko dla akcji, które już istnieją — kolejne zadania (projekty, eksport, szablony, pokaz) nie muszą zmieniać tego pliku.

- [ ] **Step 4: Utwórz `src/ui/statusbar.js`**

```js
import { h, clear } from './dom.js';

export function installStatusbar(app) {
  const root = document.getElementById('statusbar');
  const slots = {
    format: h('span', { class: 'status-item' }),
    zoom: h('span', { class: 'status-item' }),
    selection: h('span', { class: 'status-item' }),
    info: h('span', { class: 'status-item spacer' }),
    autosave: h('span', { class: 'status-item' }),
    dirty: h('span', { class: 'status-item', 'data-testid': 'status-dirty' }),
  };
  clear(root).append(...Object.values(slots));
  app.ui.status = {
    set(slot, text) {
      if (slots[slot]) slots[slot].textContent = text;
    },
  };

  const refreshDoc = () => {
    const doc = app.store.doc;
    const f = doc.formats[doc.orientation];
    slots.format.textContent = `${f.w} × ${f.h} px · ${doc.orientation === 'landscape' ? 'poziomo' : 'pionowo'}`;
    slots.dirty.textContent = app.store.dirty ? '● Niezapisane zmiany' : '✓ Zapisano';
  };
  const refreshSelection = () => {
    const ids = app.selection.ids.filter((id) => app.store.doc.elements[id]);
    slots.selection.textContent = !ids.length
      ? 'Nic nie zaznaczono'
      : ids.length === 1
        ? `Zaznaczono: ${app.store.doc.elements[ids[0]].name}`
        : `Zaznaczono elementów: ${ids.length}`;
  };
  app.store.subscribe(() => {
    refreshDoc();
    refreshSelection();
  });
  app.selection.subscribe(refreshSelection);
  app.editor.on('view', (view) => {
    slots.zoom.textContent = `Powiększenie ${Math.round(view.scale * 100)}%`;
  });
  refreshDoc();
  refreshSelection();
}
```

- [ ] **Step 5: Utwórz `src/ui/sidebar.js`**

```js
import { h, clear } from './dom.js';

export function installSidebar(app, panels) {
  const tabs = document.getElementById('tabs');
  const root = document.getElementById('panel');
  let active = panels[0].id;
  let scope = null;
  let lastKey = null;

  function renderTabs() {
    clear(tabs).append(...panels.map((p) =>
      h('button', {
        type: 'button',
        class: `tab${p.id === active ? ' active' : ''}`,
        'data-testid': `tab-${p.id}`,
        onClick: () => app.ui.showTab(p.id),
      }, p.label)));
  }

  function rebuild(force = false) {
    const panel = panels.find((p) => p.id === active);
    const key = `${active}|${panel.key(app.store.doc, app.selection)}`;
    if (!force && key === lastKey) return;
    lastKey = key;
    const scrollTop = root.scrollTop;
    scope?.dispose();
    scope = app.ui.binder.scope();
    clear(root);
    try {
      panel.render(root, { app, binder: scope });
    } catch (err) {
      console.error('Błąd panelu', panel.id, err);
      root.append(h('p', { class: 'error-text' }, 'Nie udało się wyświetlić panelu. Spróbuj innej zakładki.'));
    }
    root.scrollTop = scrollTop;
    if (app.ui.focusAfterRender) {
      root.querySelector(app.ui.focusAfterRender)?.focus();
      app.ui.focusAfterRender = null;
    }
  }

  app.ui.showTab = (id) => {
    if (!panels.some((p) => p.id === id)) return;
    active = id;
    renderTabs();
    rebuild(true);
  };

  app.store.subscribe(() => rebuild());
  app.selection.subscribe(({ ids }) => {
    const hasElementPanel = panels.some((p) => p.id === 'element');
    if (ids.length && hasElementPanel && active !== 'element' && active !== 'layers') app.ui.showTab('element');
    else rebuild();
  });

  renderTabs();
  rebuild(true);
}
```

- [ ] **Step 6: Utwórz `src/ui/panels/common.js` (edytory wspólne dla paneli „Treść” i „Element”)**

```js
import { h } from '../dom.js';
import { textField, selectField, toggleField, button } from '../controls.js';
import { restoreRole } from '../../core/document.js';
import { MAX_POINTS } from '../../core/constants.js';
import { QR_KINDS, QR_FIELDS, qrValidationError } from '../../core/qr.js';

export const elProp = (id, key) => ({
  get: (doc) => doc.elements[id]?.[key],
  set: (doc, value) => {
    const el = doc.elements[id];
    if (!el) return false;
    el[key] = value;
  },
  key: `el:${id}:${key}`,
});

export function visibilityToggle(binder, id) {
  const t = toggleField({ label: 'Widoczny w tej orientacji', testId: `visible-${id}` });
  binder.bind(t, {
    get: (doc) => !doc.boxes[doc.orientation][id]?.hidden,
    set: (doc, visible) => {
      const b = doc.boxes[doc.orientation][id];
      if (!b) return false;
      b.hidden = !visible;
    },
  });
  return t.el;
}

export function restoreBox(app, role, title) {
  return h('div', {},
    h('p', { class: 'hint' }, `Element „${title}” został usunięty z plakatu.`),
    button(`Przywróć: ${title}`, () => {
      let id;
      app.store.update((doc) => {
        id = restoreRole(doc, role);
      });
      app.selection.set([id]);
    }, { kind: 'primary', testId: `restore-${role}` }));
}

export function pointsEditor(app, binder, id) {
  const el = app.store.doc.elements[id];
  const count = el.items.length;
  const update = (fn) => app.store.update((doc) => {
    const items = doc.elements[id]?.items;
    if (!items) return false;
    return fn(items);
  });

  const rows = el.items.map((_, i) => {
    const field = textField({ placeholder: `Punkt ${i + 1}`, testId: `point-input-${i}`, maxLength: 160 });
    binder.bind(field, {
      get: (doc) => doc.elements[id]?.items[i] ?? '',
      set: (doc, value) => {
        const items = doc.elements[id]?.items;
        if (!items || i >= items.length) return false;
        items[i] = value;
      },
      key: `points:${id}:${i}`,
    });
    const move = (dir) => update((items) => {
      const j = i + dir;
      if (j < 0 || j >= items.length) return false;
      [items[i], items[j]] = [items[j], items[i]];
    });
    return h('div', { class: 'points-row' },
      field.input,
      button('↑', () => move(-1), { small: true, title: 'W górę', disabled: i === 0 }),
      button('↓', () => move(1), { small: true, title: 'W dół', disabled: i === count - 1 }),
      button('✕', () => update((items) => (items.length <= 1 ? false : void items.splice(i, 1))), { small: true, title: 'Usuń punkt', disabled: count <= 1 }));
  });

  const add = button('+ Dodaj punkt', () => {
    app.ui.focusAfterRender = `[data-testid="point-input-${count}"]`;
    update((items) => (items.length >= MAX_POINTS ? false : void items.push('')));
  }, { disabled: count >= MAX_POINTS, testId: 'add-point' });

  return [
    ...rows,
    h('div', { class: 'btn-row', style: { marginTop: '6px' } }, add),
    h('p', { class: 'hint' }, `Do ${MAX_POINTS} punktów. Krótkie hasła najlepiej czytają się z daleka.`),
  ];
}

export function qrDataEditor(app, binder, id) {
  const el = app.store.doc.elements[id];
  const kind = selectField({
    label: 'Co ma otwierać kod?',
    options: Object.entries(QR_KINDS).map(([value, label]) => ({ value, label })),
    testId: 'qr-kind',
  });
  binder.bind(kind, elProp(id, 'kind'));

  const fields = QR_FIELDS[el.kind].map((f) => {
    const control = f.type === 'select'
      ? selectField({ label: f.label, options: Object.entries(f.options).map(([value, label]) => ({ value, label })) })
      : textField({
        label: f.label,
        multiline: f.type === 'textarea',
        type: f.type === 'textarea' ? 'text' : f.type,
        placeholder: f.placeholder ?? '',
        testId: `qr-${f.key}`,
        maxLength: 1000,
      });
    const fallback = f.type === 'select' ? Object.keys(f.options)[0] : '';
    binder.bind(control, {
      get: (doc) => doc.elements[id]?.data[f.key] ?? fallback,
      set: (doc, value) => {
        if (!doc.elements[id]) return false;
        doc.elements[id].data[f.key] = String(value);
      },
      key: `qr:${id}:${f.key}`,
    });
    return control.el;
  });

  const error = h('p', { class: 'error-text', 'data-testid': 'qr-error' });
  binder.watch((doc) => {
    const e = doc.elements[id];
    error.textContent = e ? (qrValidationError(e.kind, e.data) ?? '') : '';
  });

  const caption = textField({ label: 'Podpis pod kodem', placeholder: 'np. Zeskanuj mnie', testId: 'qr-caption', maxLength: 60 });
  binder.bind(caption, { ...elProp(id, 'caption'), get: (doc) => doc.elements[id]?.caption ?? '' });

  return [kind.el, ...fields, error, caption.el];
}
```

- [ ] **Step 7: Utwórz `src/ui/panels/content.js`**

```js
import { h } from '../dom.js';
import { textField, button, section } from '../controls.js';
import { findByRole } from '../../core/document.js';
import { visibilityToggle, restoreBox, pointsEditor, qrDataEditor, elProp } from './common.js';

function photoSection(app, binder) {
  const el = findByRole(app.store.doc, 'photo');
  if (!el) return section('Zdjęcie', [restoreBox(app, 'photo', 'Zdjęcie')]);
  const asset = app.store.getAsset(el.assetId);
  const preview = asset
    ? h('img', { class: 'thumb', src: asset.dataUrl, alt: 'Podgląd zdjęcia' })
    : h('div', { class: 'thumb', style: { display: 'flex', alignItems: 'center', justifyContent: 'center' } }, h('span', { class: 'hint' }, 'Brak zdjęcia'));
  return section('Zdjęcie', [
    preview,
    h('div', { class: 'btn-row', style: { marginTop: '8px' } },
      button(asset ? 'Zmień zdjęcie' : 'Wybierz zdjęcie', () => app.actions.pickPhoto(el.id), { kind: 'primary', testId: 'pick-photo' }),
      asset ? button('Kadruj', () => app.actions.enterCrop(el.id)) : null,
      asset ? button('Usuń', () => app.actions.removeImage(el.id), { kind: 'ghost' }) : null),
    h('p', { class: 'hint' }, 'Możesz też przeciągnąć plik na plakat albo wkleić obraz (Ctrl+V). Dwuklik na zdjęciu = kadrowanie.'),
    visibilityToggle(binder, el.id),
  ]);
}

function textSection(app, binder, role, title, { testId, placeholder, rows = 2 }) {
  const el = findByRole(app.store.doc, role);
  if (!el) return section(title, [restoreBox(app, role, title)]);
  const field = textField({ multiline: true, rows, testId, placeholder, maxLength: 400 });
  binder.bind(field, { ...elProp(el.id, 'text'), get: (doc) => doc.elements[el.id]?.text ?? '' });
  return section(title, [field.el, visibilityToggle(binder, el.id)]);
}

function pointsSection(app, binder) {
  const el = findByRole(app.store.doc, 'points');
  if (!el) return section('Punkty', [restoreBox(app, 'points', 'Punkty')]);
  return section('Punkty', [
    ...pointsEditor(app, binder, el.id),
    h('p', { class: 'hint' }, 'Wygląd punktów (znaczniki, kolory, czcionka) ustawisz w zakładce „Element”.'),
    visibilityToggle(binder, el.id),
  ]);
}

function qrSection(app, binder) {
  const el = findByRole(app.store.doc, 'qr');
  if (!el) return section('Kod QR', [restoreBox(app, 'qr', 'Kod QR')]);
  return section('Kod QR', [
    ...qrDataEditor(app, binder, el.id),
    h('p', { class: 'hint' }, 'Kolory, styl modułów i logo w środku ustawisz w zakładce „Element”.'),
    visibilityToggle(binder, el.id),
  ]);
}

function projectNameSection(binder) {
  const name = textField({ label: 'Nazwa projektu (używana w nazwach plików)', testId: 'project-name', maxLength: 120 });
  binder.bind(name, {
    get: (doc) => doc.meta.name,
    set: (doc, value) => {
      doc.meta.name = value.trim() ? value : 'Plakat';
    },
    key: 'meta:name',
  });
  return name.el;
}

export const contentPanel = {
  id: 'content',
  label: 'Treść',
  key(doc) {
    return ['photo', 'title', 'subtitle', 'points', 'qr', 'footer'].map((role) => {
      const e = findByRole(doc, role);
      if (!e) return `${role}:-`;
      if (role === 'points') return `${role}:${e.id}:${e.items.length}`;
      if (role === 'qr') return `${role}:${e.id}:${e.kind}`;
      if (role === 'photo') return `${role}:${e.id}:${e.assetId}`;
      return `${role}:${e.id}`;
    }).join('|');
  },
  render(root, { app, binder }) {
    root.append(
      projectNameSection(binder),
      photoSection(app, binder),
      textSection(app, binder, 'title', 'Tytuł', { testId: 'title-input', placeholder: 'Główne hasło plakatu' }),
      textSection(app, binder, 'subtitle', 'Podtytuł', { testId: 'subtitle-input', placeholder: 'Krótkie uzupełnienie' }),
      pointsSection(app, binder),
      qrSection(app, binder),
      textSection(app, binder, 'footer', 'Stopka', { testId: 'footer-input', placeholder: 'Kontakt, adres, strona www', rows: 1 }),
    );
  },
};
```

- [ ] **Step 8: Utwórz `src/ui/index.js`**

```js
import { createBinder } from './binder.js';
import { installToolbar } from './toolbar.js';
import { installStatusbar } from './statusbar.js';
import { installSidebar } from './sidebar.js';
import { contentPanel } from './panels/content.js';

export const PANELS = [contentPanel];

export function installUI(app) {
  app.ui.binder = createBinder(app.store);
  installToolbar(app);
  installStatusbar(app);
  installSidebar(app, PANELS);
}
```

- [ ] **Step 9: Podłącz UI w `src/renderer/main.js`**

Dodaj import pod `import { installShortcuts } from '../ui/shortcuts.js';`:
```js
import { installUI } from '../ui/index.js';
```
Zmień listę na (UI zawsze na końcu):
```js
const FEATURES = [installImages, installInteraction, installCommands, installShortcuts, installUI];
```

- [ ] **Step 10: Sprawdź ręcznie**

Run: `npm start`
Expected:
- Pasek narzędzi: ↶ ↷ (wyszarzone na starcie), Poziomo/Pionowo, „+ Dodaj ▾” (Tekst, Obraz, Prostokąt, Elipsa, Linia, Kod QR), zoom „− 47% +”, „?”. Menu „Plik ▾”, „Zapisz”, „Pokaz” i „Eksportuj” pojawią się, gdy późniejsze zadania dodadzą swoje akcje. Klik poza menu lub Esc zamyka menu.
- Zakładka „Treść”: wpisywanie w „Tytuł” zmienia plakat na żywo; Ctrl+Z w polu cofa tekst w polu, a poza polem — zmianę na plakacie.
- „+ Dodaj punkt” dodaje 5. pole i ustawia w nim kursor; przy 6 przycisk jest wyłączony; ↑/↓ zmieniają kolejność; ✕ usuwa.
- Zmiana „Co ma otwierać kod?” na „Sieć Wi-Fi” pokazuje pola SSID/Hasło; pusty SSID → czerwony komunikat i zastępczy napis w miejscu kodu.
- Usuń tytuł (zaznacz + Delete) → w sekcji „Tytuł” pojawia się „Przywróć: Tytuł”, który go odtwarza.
- „Widoczny w tej orientacji” odznaczony ukrywa element tylko w bieżącej orientacji.
- Pasek stanu: „1920 × 1080 px · poziomo”, powiększenie, zaznaczenie, „● Niezapisane zmiany” po edycji.

Run: `npm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/ui src/renderer/main.js
git commit -m "feat(ui): kontrolki z bindingami, pasek narzędzi, pasek stanu, zakładki i panel Treść"
```

---
### Task 18: Panel „Wygląd” — motywy, paleta, kolory ze zdjęcia, czcionki, tło

**Files:**
- Create: `src/ui/fontOptions.js`, `src/ui/panels/style.js`
- Modify: `src/ui/index.js`

**Interfaces:**
- Consumes: kontrolki i `section` (Zadanie 17), `THEMES`, `applyTheme` (themes), `PALETTE_KEYS`, `PALETTE_LABELS`, `BACKGROUND_TYPES`, `PATTERNS` (constants), `BUNDLED_FONTS`, `SYSTEM_FONTS` (fonts), `contrastRatio`, `paletteFromImage` (colors), `findByRole` (document), `toast`, akcja `pickBackgroundImage` (Zadanie 13).
- Produces:
  - `fontOptions.js`: `fontOptions(doc?): { value, label, group, style }[]` — z `doc` dodaje pozycje „Nagłówkowa motywu” / „Tekstowa motywu” (`heading` / `body`)
  - `panels/style.js`: `stylePanel` (id `style`, etykieta „Wygląd”), funkcja `paletteFromPhoto(app): Promise<void>`

- [ ] **Step 1: Utwórz `src/ui/fontOptions.js`**

```js
import { BUNDLED_FONTS, SYSTEM_FONTS } from '../core/fonts.js';

export function fontOptions(doc = null) {
  const options = [];
  if (doc) {
    options.push(
      { value: 'heading', label: `Nagłówkowa z motywu (${doc.fonts.heading})`, group: 'Z motywu' },
      { value: 'body', label: `Tekstowa z motywu (${doc.fonts.body})`, group: 'Z motywu' },
    );
  }
  for (const f of BUNDLED_FONTS) options.push({ value: f.family, label: f.family, group: f.category, style: `font-family: "${f.family}"` });
  for (const f of SYSTEM_FONTS) options.push({ value: f, label: f, group: 'Systemowe (Windows)', style: `font-family: "${f}"` });
  return options;
}
```

- [ ] **Step 2: Utwórz `src/ui/panels/style.js`**

```js
import { h } from '../dom.js';
import { colorField, selectField, slider, segmented, button, section } from '../controls.js';
import { fontOptions } from '../fontOptions.js';
import { THEMES, applyTheme } from '../../core/themes.js';
import { PALETTE_KEYS, PALETTE_LABELS, BACKGROUND_TYPES, PATTERNS } from '../../core/constants.js';
import { contrastRatio, paletteFromImage } from '../../core/colors.js';
import { findByRole } from '../../core/document.js';
import { toast } from '../dialogs.js';

const SHORT_BG = { solid: 'Kolor', linear: 'Gradient', radial: 'Radialny', image: 'Zdjęcie', pattern: 'Wzór' };

const bgProp = (key) => ({
  get: (doc) => doc.background[key],
  set: (doc, value) => {
    doc.background[key] = value;
  },
  key: `bg:${key}`,
});

export async function paletteFromPhoto(app) {
  const photo = findByRole(app.store.doc, 'photo');
  const asset = app.store.getAsset(photo?.assetId);
  if (!asset) {
    toast('Najpierw dodaj zdjęcie — kolory zostaną z niego odczytane.');
    return;
  }
  const img = new Image();
  img.src = asset.dataUrl;
  await img.decode();
  const s = 96 / Math.max(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * s));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * s));
  const c2d = canvas.getContext('2d', { willReadFrequently: true });
  c2d.drawImage(img, 0, 0, canvas.width, canvas.height);
  const palette = paletteFromImage(c2d.getImageData(0, 0, canvas.width, canvas.height).data);
  if (!palette) {
    toast('Nie udało się odczytać kolorów ze zdjęcia.', { type: 'error' });
    return;
  }
  app.store.update((doc) => {
    doc.palette = palette;
    doc.themeId = 'custom';
  });
  toast('Dopasowano kolory do zdjęcia. Ctrl+Z przywraca poprzednie.', { type: 'success' });
}

function themesSection(app, binder) {
  const cards = THEMES.map((theme) => {
    const p = theme.palette;
    return h('div', {
      class: 'card',
      'data-theme': theme.id,
      'data-testid': `theme-${theme.id}`,
      title: `${theme.fonts.heading} + ${theme.fonts.body}`,
      onClick: () => app.store.update((doc) => {
        applyTheme(doc, theme);
      }),
    },
    h('div', { class: 'card-preview', style: { background: `linear-gradient(135deg, ${p.bg}, ${p.bg2})` } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        h('span', { style: { fontFamily: `"${theme.fonts.heading}"`, fontWeight: '700', fontSize: '24px', color: p.text } }, 'Aa'),
        h('span', { style: { width: '28px', height: '6px', borderRadius: '3px', background: p.accent } }))),
    h('div', { class: 'card-name' }, theme.name));
  });
  binder.watch((doc) => {
    for (const card of cards) card.classList.toggle('active', card.dataset.theme === doc.themeId);
  });
  return section('Motyw', [
    h('div', { class: 'card-grid' }, cards),
    h('p', { class: 'hint' }, 'Motyw zmienia kolory, czcionki, tło i styl elementów. Treść i położenie zostają bez zmian.'),
  ]);
}

function paletteSection(app, binder) {
  const fields = PALETTE_KEYS.map((k) => {
    const field = colorField({ label: PALETTE_LABELS[k], settings: app.settings, allowPalette: false, testId: `palette-${k}` });
    binder.bind(field, {
      get: (doc) => doc.palette[k],
      set: (doc, value) => {
        if (!value?.startsWith('#')) return false;
        doc.palette[k] = value;
        doc.themeId = 'custom';
      },
      key: `palette:${k}`,
    });
    return field.el;
  });
  const warnings = h('div');
  binder.watch((doc) => {
    const p = doc.palette;
    const msgs = [];
    const text = contrastRatio(p.text, p.bg);
    const accent = contrastRatio(p.accent, p.bg);
    if (text < 4.5) msgs.push(`⚠ Słaby kontrast tekstu z tłem (${text.toFixed(1)}:1, zalecane co najmniej 4.5:1).`);
    if (accent < 3) msgs.push(`⚠ Akcent słabo odcina się od tła (${accent.toFixed(1)}:1).`);
    warnings.replaceChildren(...msgs.map((m) => h('p', { class: 'warning' }, m)));
  });
  return section('Kolory', [
    h('div', { class: 'two-col' }, fields),
    warnings,
    h('div', { class: 'btn-row' },
      button('🎨 Kolory ze zdjęcia', () => paletteFromPhoto(app), { testId: 'palette-from-photo', title: 'Dobierz paletę do Twojego zdjęcia' })),
    h('p', { class: 'hint' }, 'Elementy korzystające z kolorów motywu zmienią się automatycznie.'),
  ]);
}

function fontsSection(binder) {
  const heading = selectField({ label: 'Czcionka nagłówków', options: fontOptions(), testId: 'font-heading' });
  const body = selectField({ label: 'Czcionka tekstu', options: fontOptions(), testId: 'font-body' });
  binder.bind(heading, { get: (doc) => doc.fonts.heading, set: (doc, v) => { doc.fonts.heading = v; } });
  binder.bind(body, { get: (doc) => doc.fonts.body, set: (doc, v) => { doc.fonts.body = v; } });
  return section('Czcionki', [heading.el, body.el, h('p', { class: 'hint' }, 'Wszystkie wbudowane czcionki mają polskie znaki i działają bez internetu.')]);
}

function backgroundSection(app, binder) {
  const doc = app.store.doc;
  const type = segmented({
    label: 'Rodzaj tła',
    options: Object.entries(BACKGROUND_TYPES).map(([value, label]) => ({ value, label: SHORT_BG[value], title: label })),
    testId: 'bg-type',
  });
  binder.bind(type, bgProp('type'));
  const parts = [type.el];
  const t = doc.background.type;

  if (t === 'linear') {
    const angle = slider({ label: 'Kąt gradientu', min: 0, max: 360, step: 5, unit: '°' });
    binder.bind(angle, bgProp('angle'));
    parts.push(angle.el, h('p', { class: 'hint' }, 'Gradient przechodzi od koloru „Tło” do „Tło 2”.'));
  }
  if (t === 'radial') parts.push(h('p', { class: 'hint' }, 'Środek w kolorze „Tło 2”, brzegi w kolorze „Tło”.'));
  if (t === 'image') {
    const photo = findByRole(doc, 'photo');
    parts.push(h('div', { class: 'btn-row' },
      button('Wybierz obraz tła', () => app.actions.pickBackgroundImage(), { kind: 'primary' }),
      photo?.assetId ? button('Użyj zdjęcia z plakatu', () => app.store.update((d) => { d.background.imageId = photo.assetId; })) : null));
    if (!doc.background.imageId) parts.push(h('p', { class: 'hint' }, 'Brak obrazu — widać kolor „Tło”.'));
    const blur = slider({ label: 'Rozmycie', min: 0, max: 40, step: 1 });
    const dim = slider({ label: 'Przyciemnienie', min: 0, max: 0.9, step: 0.05, format: (v) => Math.round(v * 100), unit: '%' });
    binder.bind(blur, bgProp('blur'));
    binder.bind(dim, bgProp('dim'));
    parts.push(blur.el, dim.el);
  }
  if (t === 'pattern') {
    const pattern = selectField({ label: 'Wzór', options: Object.entries(PATTERNS).map(([value, label]) => ({ value, label })) });
    const size = slider({ label: 'Wielkość wzoru', min: 16, max: 200, step: 2, unit: ' px' });
    const opacity = slider({ label: 'Widoczność wzoru', min: 0.02, max: 0.6, step: 0.02, format: (v) => Math.round(v * 100), unit: '%' });
    const color = colorField({ label: 'Kolor wzoru', settings: app.settings });
    binder.bind(pattern, bgProp('pattern'));
    binder.bind(size, bgProp('patternSize'));
    binder.bind(opacity, bgProp('patternOpacity'));
    binder.bind(color, bgProp('patternColor'));
    parts.push(pattern.el, size.el, opacity.el, color.el);
  }
  return section('Tło', parts);
}

export const stylePanel = {
  id: 'style',
  label: 'Wygląd',
  key(doc) {
    const photo = findByRole(doc, 'photo');
    return `${doc.background.type}|${doc.background.imageId}|${photo?.assetId ?? ''}`;
  },
  render(root, { app, binder }) {
    root.append(themesSection(app, binder), paletteSection(app, binder), fontsSection(binder), backgroundSection(app, binder));
  },
};
```

- [ ] **Step 3: Dodaj panel w `src/ui/index.js`**

Dodaj import pod `import { contentPanel } from './panels/content.js';`:
```js
import { stylePanel } from './panels/style.js';
```
Zmień `export const PANELS = [contentPanel];` na:
```js
export const PANELS = [contentPanel, stylePanel];
```

- [ ] **Step 4: Sprawdź ręcznie**

Run: `npm start`
Expected:
- Zakładka „Wygląd”: 10 kart motywów z podglądem „Aa” w czcionce motywu; klik w „Ocean” zmienia kolory, czcionki, kształt zdjęcia na koło z ramką i styl QR na kropki; Ctrl+Z wraca.
- Zmiana koloru „Tekst” na ciemnoszary przy ciemnym tle pokazuje ostrzeżenie o kontraście; karta motywu przestaje być zaznaczona.
- Po dodaniu zdjęcia „🎨 Kolory ze zdjęcia” dopasowuje paletę.
- Czcionki: lista pogrupowana (Bezszeryfowe, Nagłówkowe, Szeryfowe, Odręczne, Systemowe); zmiana zmienia tytuł na żywo.
- Tło: „Wzór” → pojawiają się suwaki wzoru; „Zdjęcie” → „Użyj zdjęcia z plakatu” daje rozmyte, przyciemnione tło.

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/fontOptions.js src/ui/panels/style.js src/ui/index.js
git commit -m "feat(ui): panel Wygląd — motywy, paleta z ostrzeżeniami kontrastu, kolory ze zdjęcia, czcionki, tło"
```

---
### Task 19: Panele „Układ” i „Warstwy”

**Files:**
- Create: `src/ui/panels/layout.js`, `src/ui/panels/layers.js`
- Modify: `src/ui/index.js`

**Interfaces:**
- Consumes: kontrolki (Zadanie 17), `LAYOUTS`, `LAYOUT_ROLES`, `computeLayout`, `applyLayout` (layouts), `chooseLayout`, `setFormat` (document), `FORMAT_PRESETS`, `MIN_FORMAT`, `MAX_FORMAT` (constants), `TYPE_NAMES` (model), `renameElement`, `toggleHidden`, `setLocked`, `reorder` (elementOps), `promptDialog` (dialogs), akcje `setOrientation`, `reorderSelection`, ustawienia `showGrid`, `gridSize`, `showSafeArea`, `snap`.
- Produces: `layoutPanel` (id `layout`, „Układ”), `layersPanel` (id `layers`, „Warstwy”), `layoutPreviewSvg(layoutId, format, orientation): string`, `bindSetting(control, settings, key)`.

- [ ] **Step 1: Utwórz `src/ui/panels/layout.js`**

```js
import { h } from '../dom.js';
import { selectField, numberField, toggleField, slider, segmented, button, section } from '../controls.js';
import { LAYOUTS, LAYOUT_ROLES, computeLayout, applyLayout } from '../../core/layouts.js';
import { chooseLayout, setFormat } from '../../core/document.js';
import { FORMAT_PRESETS, MIN_FORMAT, MAX_FORMAT } from '../../core/constants.js';
import { toast } from '../dialogs.js';

const ROLE_COLORS = {
  photo: '#6b7a99', panel: 'rgba(255,255,255,0.14)', accent: '#4f8cff', title: '#e8eaf0',
  subtitle: '#9aa1b2', points: '#7d8597', qr: '#ffffff', footer: '#5c6375',
};

export function layoutPreviewSvg(layoutId, format, orientation) {
  const boxes = computeLayout(layoutId, format, orientation);
  const rects = LAYOUT_ROLES.filter((role) => !boxes[role].hidden).map((role) => {
    const b = boxes[role];
    return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${role === 'photo' ? 24 : 8}" fill="${ROLE_COLORS[role]}"/>`;
  });
  return `<svg viewBox="0 0 ${format.w} ${format.h}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><rect width="${format.w}" height="${format.h}" fill="#2a2f3b"/>${rects.join('')}</svg>`;
}

export function bindSetting(control, settings, key) {
  control.set(settings.get(key));
  control.onChange((value) => settings.set({ [key]: value }));
  return settings.subscribe((values) => control.set(values[key]));
}

function orientationSection(app, binder) {
  const seg = segmented({
    options: [
      { value: 'landscape', label: '▭ Poziomo', title: 'Ctrl+1' },
      { value: 'portrait', label: '▯ Pionowo', title: 'Ctrl+2' },
    ],
    testId: 'layout-orientation',
  });
  seg.set(app.store.doc.orientation);
  seg.onChange((o) => app.actions.setOrientation(o));
  binder.watch((doc) => seg.set(doc.orientation));
  return section('Orientacja', [
    seg.el,
    h('p', { class: 'hint' }, 'Każda orientacja ma własne położenie elementów, ale wspólną treść i wygląd. Eksport może zapisać obie naraz.'),
  ]);
}

function formatSection(app, binder) {
  const doc = app.store.doc;
  const select = selectField({
    label: 'Format ekranu',
    options: [...FORMAT_PRESETS.map((p) => ({ value: p.id, label: p.label })), { value: 'custom', label: 'Własny rozmiar…' }],
    testId: 'format-select',
  });
  select.set(doc.formatId);
  select.onChange((id) => app.store.update((d) => {
    if (id === 'custom') setFormat(d, 'custom', d.formats.landscape);
    else setFormat(d, id);
  }));
  binder.watch((d) => select.set(d.formatId));
  const parts = [select.el];

  if (doc.formatId === 'custom') {
    const w = numberField({ label: 'Szerokość (px)', min: MIN_FORMAT, max: MAX_FORMAT, testId: 'custom-w' });
    const hgt = numberField({ label: 'Wysokość (px)', min: MIN_FORMAT, max: MAX_FORMAT, testId: 'custom-h' });
    w.set(doc.formats.landscape.w);
    hgt.set(doc.formats.landscape.h);
    const apply = () => app.store.update((d) => {
      setFormat(d, 'custom', { w: Number(w.input.value), h: Number(hgt.input.value) });
    });
    parts.push(h('div', { class: 'two-col' }, w.el, hgt.el), button('Zastosuj rozmiar', apply, { kind: 'primary' }));
  }
  parts.push(
    h('p', { class: 'hint' }, 'Zmiana formatu przeskalowuje elementy. Użyj „Ułóż ponownie”, aby dopasować układ.'),
    h('div', { class: 'btn-row' },
      button('Ułóż ponownie tę orientację', () => {
        app.store.update((d) => {
          applyLayout(d, d.layoutId, [d.orientation]);
        });
        toast('Elementy wróciły na miejsca z wybranego układu.');
      }, { testId: 'relayout' })),
  );
  return section('Format', parts);
}

function layoutsSection(app, binder) {
  const doc = app.store.doc;
  const format = doc.formats[doc.orientation];
  const cards = Object.entries(LAYOUTS).map(([id, def]) =>
    h('div', {
      class: 'card',
      'data-layout': id,
      'data-testid': `layout-${id}`,
      title: def.name,
      onClick: () => app.store.update((d) => {
        chooseLayout(d, id);
      }),
    },
    h('div', { class: 'card-preview', html: layoutPreviewSvg(id, format, doc.orientation) }),
    h('div', { class: 'card-name' }, def.name)));
  binder.watch((d) => {
    for (const card of cards) card.classList.toggle('active', card.dataset.layout === d.layoutId);
  });
  return section('Układ elementów', [
    h('div', { class: 'card-grid' }, cards),
    h('p', { class: 'hint' }, 'Wybór układu ustawia elementy w obu orientacjach. Potem możesz je dowolnie przeciągać.'),
  ]);
}

function helpersSection(app) {
  const grid = toggleField({ label: 'Pokaż siatkę (Ctrl+G)', testId: 'toggle-grid' });
  const gridSize = slider({ label: 'Rozmiar siatki', min: 10, max: 200, step: 5, unit: ' px' });
  const safe = toggleField({ label: 'Pokaż obszar bezpieczny TV (Ctrl+Shift+G)', testId: 'toggle-safe' });
  const snap = toggleField({ label: 'Przyciąganie do linii pomocniczych', testId: 'toggle-snap' });
  const offs = [
    bindSetting(grid, app.settings, 'showGrid'),
    bindSetting(gridSize, app.settings, 'gridSize'),
    bindSetting(safe, app.settings, 'showSafeArea'),
    bindSetting(snap, app.settings, 'snap'),
  ];
  const el = section('Pomoce', [
    grid.el,
    gridSize.el,
    safe.el,
    h('p', { class: 'hint' }, 'Niektóre telewizory obcinają brzegi obrazu — trzymaj ważne treści wewnątrz pomarańczowej ramki.'),
    snap.el,
  ]);
  return { el, dispose: () => offs.forEach((off) => off()) };
}

export const layoutPanel = {
  id: 'layout',
  label: 'Układ',
  key(doc) {
    const f = doc.formats[doc.orientation];
    return `${doc.orientation}|${doc.formatId}|${f.w}x${f.h}`;
  },
  render(root, { app, binder }) {
    const helpers = helpersSection(app);
    root.append(orientationSection(app, binder), layoutsSection(app, binder), formatSection(app, binder), helpers.el);
    root.addEventListener('panel:dispose', helpers.dispose, { once: true });
  },
};
```

Uwaga: `sidebar.js` musi wysyłać zdarzenie `panel:dispose` przed przebudową — patrz Krok 3.

- [ ] **Step 2: Utwórz `src/ui/panels/layers.js`**

```js
import { h } from '../dom.js';
import { button, section } from '../controls.js';
import { TYPE_NAMES } from '../../core/model.js';
import { renameElement, toggleHidden, setLocked, reorder } from '../../core/elementOps.js';
import { promptDialog } from '../dialogs.js';

export const layersPanel = {
  id: 'layers',
  label: 'Warstwy',
  key(doc, selection) {
    const boxes = doc.boxes[doc.orientation];
    return doc.order.map((id) => {
      const el = doc.elements[id];
      return `${id}:${el.name}:${el.locked ? 1 : 0}:${boxes[id]?.hidden ? 1 : 0}:${selection.has(id) ? 1 : 0}`;
    }).join('|');
  },
  render(root, { app }) {
    const { store, selection } = app;
    const doc = store.doc;
    const boxes = doc.boxes[doc.orientation];
    const rows = [...doc.order].reverse().map((id) => {
      const el = doc.elements[id];
      const hidden = !!boxes[id]?.hidden;
      const stop = (fn) => (e) => {
        e.stopPropagation();
        fn();
      };
      return h('div', {
        class: `layer-row${selection.has(id) ? ' selected' : ''}${hidden ? ' hidden-el' : ''}`,
        'data-testid': `layer-${id}`,
        onClick: (e) => (e.shiftKey || e.ctrlKey ? selection.toggle(id) : selection.set([id])),
        onDblclick: async () => {
          const name = await promptDialog({ title: 'Zmień nazwę warstwy', label: 'Nazwa', value: el.name });
          if (name) store.update((d) => renameElement(d, id, name) || false);
        },
      },
      h('span', { class: 'layer-type' }, TYPE_NAMES[el.type]),
      h('span', { class: 'layer-name', title: 'Dwuklik — zmiana nazwy' }, el.name),
      h('span', { class: 'layer-actions' },
        button(hidden ? '◌' : '◉', stop(() => store.update((d) => { toggleHidden(d, [id]); })), { small: true, kind: 'ghost', title: hidden ? 'Pokaż w tej orientacji' : 'Ukryj w tej orientacji' }),
        button(el.locked ? '🔒' : '🔓', stop(() => store.update((d) => { setLocked(d, [id], !el.locked); })), { small: true, kind: 'ghost', title: el.locked ? 'Odblokuj' : 'Zablokuj' }),
        button('↑', stop(() => store.update((d) => reorder(d, [id], 'forward') || false)), { small: true, kind: 'ghost', title: 'Warstwa wyżej' }),
        button('↓', stop(() => store.update((d) => reorder(d, [id], 'backward') || false)), { small: true, kind: 'ghost', title: 'Warstwa niżej' })));
    });
    root.append(section('Warstwy (od góry)', [
      h('div', { class: 'layer-list' }, rows),
      h('p', { class: 'hint' }, 'Klik — zaznacz, Shift+klik — dodaj do zaznaczenia, dwuklik — zmień nazwę. Ukrycie dotyczy tylko bieżącej orientacji.'),
      h('div', { class: 'btn-row' },
        button('Na wierzch', () => app.actions.reorderSelection('front'), { small: true }),
        button('Na spód', () => app.actions.reorderSelection('back'), { small: true })),
    ]));
  },
};
```

- [ ] **Step 3: Dodaj zdarzenie sprzątania w `src/ui/sidebar.js`**

W funkcji `rebuild` zamień linię:
```js
    scope?.dispose();
```
na:
```js
    root.dispatchEvent(new Event('panel:dispose'));
    scope?.dispose();
```

- [ ] **Step 4: Dodaj panele w `src/ui/index.js`**

Dodaj importy pod `import { stylePanel } from './panels/style.js';`:
```js
import { layoutPanel } from './panels/layout.js';
import { layersPanel } from './panels/layers.js';
```
Zmień `export const PANELS = [contentPanel, stylePanel];` na:
```js
export const PANELS = [contentPanel, stylePanel, layoutPanel, layersPanel];
```

- [ ] **Step 5: Sprawdź ręcznie**

Run: `npm start`
Expected:
- „Układ”: 6 kart z miniaturami (szare zdjęcie, białe teksty, QR); klik w „Karta centralna” przestawia elementy w obu orientacjach (sprawdź Ctrl+2) i zmienia zdjęcie na koło.
- Przełączenie orientacji w panelu zmienia miniatury na pionowe.
- Format „4:3” → plakat 1600×1200, elementy przeskalowane; „Ułóż ponownie tę orientację” porządkuje je.
- „Własny rozmiar…” → pola szerokość/wysokość, „Zastosuj rozmiar” (np. 1280×1024) działa; wartości poza 200–8000 są przycinane.
- „Pokaż siatkę” i „obszar bezpieczny” rysują pomoce tylko w edytorze; stan przełączników zgadza się po Ctrl+G.
- „Warstwy”: lista od góry; ◉/◌ ukrywa; 🔒 blokuje; ↑/↓ zmienia kolejność; dwuklik zmienia nazwę; zaznaczenie w liście = zaznaczenie na płótnie.

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/panels/layout.js src/ui/panels/layers.js src/ui/sidebar.js src/ui/index.js
git commit -m "feat(ui): panele Układ (orientacja, format, 6 układów, pomoce) i Warstwy"
```

---
### Task 20: Panel „Element” — właściwości zaznaczonego elementu, filtry, wyrównanie

**Files:**
- Create: `src/ui/panels/element.js`
- Modify: `src/ui/index.js`

**Interfaces:**
- Consumes: kontrolki, `elProp`, `visibilityToggle`, `pointsEditor`, `qrDataEditor` (Zadanie 17), `fontOptions` (Zadanie 18), `PHOTO_SHAPES`, `SHAPE_KINDS`, `BULLETS`, `QR_MODULE_STYLES`, `QR_ECL`, `TEXT_ALIGN`, `TEXT_VALIGN`, `MIN_BOX` (constants), `TYPE_NAMES` (model), `contrastRatio`, `relativeLuminance` (colors), `resolveColor` (model), `renameElement` (elementOps), akcje z Zadań 13–16.
- Produces: `elementPanel` (id `element`, „Element”), `FILTER_PRESETS`; akcja `app.actions.focusElementField(id)` (dwuklik w tekst/punkty/QR na płótnie przenosi kursor do pola edycji).

- [ ] **Step 1: Utwórz `src/ui/panels/element.js`**

```js
import { h } from '../dom.js';
import {
  textField, slider, numberField, selectField, toggleField, segmented, colorField, button, section,
} from '../controls.js';
import { elProp, visibilityToggle, pointsEditor, qrDataEditor } from './common.js';
import { fontOptions } from '../fontOptions.js';
import {
  PHOTO_SHAPES, SHAPE_KINDS, BULLETS, QR_MODULE_STYLES, QR_ECL, TEXT_ALIGN, TEXT_VALIGN, MIN_BOX,
} from '../../core/constants.js';
import { TYPE_NAMES, resolveColor } from '../../core/model.js';
import { contrastRatio, relativeLuminance } from '../../core/colors.js';
import { renameElement } from '../../core/elementOps.js';

export const FILTER_PRESETS = [
  { name: 'Oryginał', filters: { grayscale: 0, sepia: 0, brightness: 100, contrast: 100, saturation: 100, blur: 0 } },
  { name: 'Czarno-białe', filters: { grayscale: 100, sepia: 0, brightness: 105, contrast: 115, saturation: 100, blur: 0 } },
  { name: 'Vintage', filters: { grayscale: 0, sepia: 45, brightness: 105, contrast: 90, saturation: 80, blur: 0 } },
  { name: 'Żywe', filters: { grayscale: 0, sepia: 0, brightness: 105, contrast: 115, saturation: 140, blur: 0 } },
  { name: 'Miękkie', filters: { grayscale: 0, sepia: 10, brightness: 110, contrast: 85, saturation: 90, blur: 1 } },
];

const options = (map) => Object.entries(map).map(([value, label]) => ({ value, label: typeof label === 'string' ? label : label.label }));
const nested = (id, obj, key) => ({
  get: (doc) => doc.elements[id]?.[obj]?.[key],
  set: (doc, value) => {
    const el = doc.elements[id];
    if (!el) return false;
    el[obj][key] = value;
  },
  key: `el:${id}:${obj}.${key}`,
});
const boxProp = (id, key) => ({
  get: (doc) => doc.boxes[doc.orientation][id]?.[key],
  set: (doc, value) => {
    const b = doc.boxes[doc.orientation][id];
    if (!b) return false;
    b[key] = key === 'w' || key === 'h' ? Math.max(MIN_BOX, value) : value;
  },
  key: `box:${id}:${key}`,
});

function bindAll(binder, pairs) {
  for (const [control, spec] of pairs) binder.bind(control, spec);
  return pairs.map(([control]) => control.el);
}

// --- Sekcje wspólne ----------------------------------------------------------------

function headerSection(app, binder, el) {
  const name = textField({ label: `Nazwa (${TYPE_NAMES[el.type]})`, maxLength: 80, testId: 'el-name' });
  binder.bind(name, {
    get: (doc) => doc.elements[el.id]?.name ?? '',
    set: (doc, value) => renameElement(doc, el.id, value) || false,
    key: `el:${el.id}:name`,
  });
  return name.el;
}

function geometrySection(app, binder, el) {
  const x = numberField({ label: 'X', testId: 'el-x' });
  const y = numberField({ label: 'Y', testId: 'el-y' });
  const w = numberField({ label: 'Szer.', min: MIN_BOX, testId: 'el-w' });
  const hh = numberField({ label: 'Wys.', min: MIN_BOX, testId: 'el-h' });
  const rot = slider({ label: 'Obrót', min: -180, max: 180, step: 1, unit: '°' });
  bindAll(binder, [[x, boxProp(el.id, 'x')], [y, boxProp(el.id, 'y')], [w, boxProp(el.id, 'w')], [hh, boxProp(el.id, 'h')], [rot, boxProp(el.id, 'rotation')]]);
  return section('Położenie i rozmiar', [
    h('div', { class: 'four-col' }, x.el, y.el, w.el, hh.el),
    rot.el,
    h('div', { class: 'btn-row' },
      button('⇔ Środek poziomo', () => app.actions.alignSelection('hcenter'), { small: true }),
      button('⇕ Środek pionowo', () => app.actions.alignSelection('vcenter'), { small: true })),
  ], { open: false });
}

function arrangeSection(app, binder, el) {
  const locked = toggleField({ label: 'Zablokuj (nie da się przesunąć)', testId: 'el-locked' });
  binder.bind(locked, elProp(el.id, 'locked'));
  return section('Warstwa i akcje', [
    h('div', { class: 'btn-row' },
      button('Na wierzch', () => app.actions.reorderSelection('front'), { small: true }),
      button('Wyżej', () => app.actions.reorderSelection('forward'), { small: true }),
      button('Niżej', () => app.actions.reorderSelection('backward'), { small: true }),
      button('Na spód', () => app.actions.reorderSelection('back'), { small: true })),
    locked.el,
    visibilityToggle(binder, el.id),
    h('div', { class: 'btn-row' },
      button('Duplikuj (Ctrl+D)', () => app.actions.duplicateSelection(), { small: true }),
      button('Usuń (Delete)', () => app.actions.deleteSelection(), { small: true, kind: 'danger', testId: 'el-delete' })),
  ]);
}

function textStyleControls(app, binder, el, { withContent }) {
  const id = el.id;
  const parts = [];
  if (withContent) {
    const text = textField({ label: 'Treść', multiline: true, rows: 3, testId: 'el-text', maxLength: 400 });
    binder.bind(text, { ...elProp(id, 'text'), get: (doc) => doc.elements[id]?.text ?? '' });
    parts.push(text.el);
  }
  const font = selectField({ label: 'Czcionka', options: fontOptions(app.store.doc), testId: 'el-font' });
  const size = slider({ label: el.autoFit ? 'Rozmiar maksymalny' : 'Rozmiar', min: 8, max: 300, step: 1, unit: ' px', testId: 'el-size' });
  const autoFit = toggleField({ label: 'Dopasuj rozmiar do ramki', testId: 'el-autofit' });
  const bold = toggleField({ label: 'Pogrubienie' });
  const italic = toggleField({ label: 'Kursywa' });
  const upper = toggleField({ label: 'WIELKIE LITERY' });
  const align = segmented({ label: 'Wyrównanie', options: [{ value: 'left', label: '⟸', title: TEXT_ALIGN.left }, { value: 'center', label: '≡', title: TEXT_ALIGN.center }, { value: 'right', label: '⟹', title: TEXT_ALIGN.right }] });
  const valign = segmented({ label: 'W pionie', options: options(TEXT_VALIGN) });
  const color = colorField({ label: 'Kolor tekstu', settings: app.settings, testId: 'el-color' });
  const spacing = slider({ label: 'Odstęp liter', min: -5, max: 40, step: 0.5, unit: ' px' });
  const line = slider({ label: 'Interlinia', min: 0.8, max: 2, step: 0.05, format: (v) => v.toFixed(2) });
  const shadow = toggleField({ label: 'Cień pod tekstem' });
  const stroke = slider({ label: 'Obrys', min: 0, max: 12, step: 0.5, unit: ' px' });
  const strokeColor = colorField({ label: 'Kolor obrysu', settings: app.settings });
  bindAll(binder, [
    [font, elProp(id, 'font')], [size, elProp(id, 'size')], [autoFit, elProp(id, 'autoFit')], [bold, elProp(id, 'bold')],
    [italic, elProp(id, 'italic')], [upper, elProp(id, 'uppercase')], [align, elProp(id, 'align')], [valign, elProp(id, 'valign')],
    [color, elProp(id, 'color')], [spacing, elProp(id, 'letterSpacing')], [line, elProp(id, 'lineHeight')],
    [shadow, elProp(id, 'shadow')], [stroke, elProp(id, 'strokeWidth')], [strokeColor, elProp(id, 'strokeColor')],
  ]);
  return section('Tekst', [
    ...parts, font.el, size.el, autoFit.el,
    h('div', { class: 'two-col' }, bold.el, italic.el), upper.el,
    align.el, valign.el, color.el, spacing.el, line.el, shadow.el, stroke.el, strokeColor.el,
  ]);
}

// --- Sekcje typów --------------------------------------------------------------------

function pointsSections(app, binder, el) {
  const id = el.id;
  const bullet = selectField({ label: 'Znacznik', options: options(BULLETS), testId: 'el-bullet' });
  const bulletColor = colorField({ label: 'Kolor znacznika', settings: app.settings });
  const font = selectField({ label: 'Czcionka', options: fontOptions(app.store.doc) });
  const size = slider({ label: el.autoFit ? 'Rozmiar maksymalny' : 'Rozmiar', min: 8, max: 200, step: 1, unit: ' px' });
  const autoFit = toggleField({ label: 'Dopasuj rozmiar do ramki' });
  const bold = toggleField({ label: 'Pogrubienie' });
  const color = colorField({ label: 'Kolor tekstu', settings: app.settings });
  const spacing = slider({ label: 'Odstęp między punktami', min: 0, max: 2, step: 0.05, format: (v) => v.toFixed(2) });
  const line = slider({ label: 'Interlinia', min: 0.8, max: 2, step: 0.05, format: (v) => v.toFixed(2) });
  const distribute = segmented({ label: 'Rozmieszczenie', options: [{ value: 'top', label: 'Od góry' }, { value: 'spread', label: 'Równomiernie' }] });
  const style = [
    bullet.el,
    ...(el.bullet === 'custom' ? bindAll(binder, [[textField({ label: 'Własny znak (np. emoji)', maxLength: 4 }), elProp(id, 'customBullet')]]) : []),
    ...bindAll(binder, [
      [bulletColor, elProp(id, 'bulletColor')], [font, elProp(id, 'font')], [size, elProp(id, 'size')], [autoFit, elProp(id, 'autoFit')],
      [bold, elProp(id, 'bold')], [color, elProp(id, 'color')], [spacing, elProp(id, 'spacing')], [line, elProp(id, 'lineHeight')],
      [distribute, elProp(id, 'distribute')],
    ]),
  ];
  binder.bind(bullet, elProp(id, 'bullet'));
  return [section('Punkty', pointsEditor(app, binder, id)), section('Wygląd punktów', style)];
}

function photoSections(app, binder, el) {
  const id = el.id;
  const hasImage = !!app.store.getAsset(el.assetId);
  const shape = selectField({ label: 'Kształt', options: options(PHOTO_SHAPES), testId: 'el-photo-shape' });
  const radius = slider({ label: 'Zaokrąglenie rogów', min: 0, max: 300, step: 2, unit: ' px' });
  const border = slider({ label: 'Ramka', min: 0, max: 40, step: 1, unit: ' px' });
  const borderColor = colorField({ label: 'Kolor ramki', settings: app.settings });
  const shadow = toggleField({ label: 'Cień' });
  const flip = toggleField({ label: 'Odbicie lustrzane' });
  const zoom = slider({ label: 'Przybliżenie', min: 1, max: 5, step: 0.01, format: (v) => `${v.toFixed(2)}×` });
  const cx = slider({ label: 'Kadr w poziomie', min: 0, max: 1, step: 0.01, format: (v) => Math.round(v * 100), unit: '%' });
  const cy = slider({ label: 'Kadr w pionie', min: 0, max: 1, step: 0.01, format: (v) => Math.round(v * 100), unit: '%' });
  const filterSliders = [
    ['grayscale', 'Czarno-biel', 0, 100], ['sepia', 'Sepia', 0, 100], ['brightness', 'Jasność', 50, 150],
    ['contrast', 'Kontrast', 50, 150], ['saturation', 'Nasycenie', 0, 200], ['blur', 'Rozmycie', 0, 20],
  ].map(([key, label, min, max]) => {
    const s = slider({ label, min, max, step: 1, unit: key === 'blur' ? '' : '%' });
    binder.bind(s, nested(id, 'filters', key));
    return s.el;
  });
  const shapeEls = bindAll(binder, [
    [shape, elProp(id, 'shape')], [border, elProp(id, 'borderWidth')], [borderColor, elProp(id, 'borderColor')],
    [shadow, elProp(id, 'shadow')], [flip, elProp(id, 'flipX')],
  ]);
  if (el.shape === 'rounded') {
    binder.bind(radius, elProp(id, 'radius'));
    shapeEls.splice(1, 0, radius.el);
  }
  const cropEls = bindAll(binder, [[zoom, nested(id, 'crop', 'zoom')], [cx, nested(id, 'crop', 'x')], [cy, nested(id, 'crop', 'y')]]);
  return [
    section('Zdjęcie', [
      h('div', { class: 'btn-row' },
        button(hasImage ? 'Zmień zdjęcie' : 'Wybierz zdjęcie', () => app.actions.pickPhoto(id), { kind: 'primary' }),
        hasImage ? button('Kadruj myszą', () => app.actions.enterCrop(id)) : null,
        hasImage ? button('Usuń', () => app.actions.removeImage(id), { kind: 'ghost' }) : null),
      ...shapeEls,
    ]),
    section('Kadr', [
      ...cropEls,
      button('Wyśrodkuj kadr', () => app.store.update((d) => { d.elements[id].crop = { zoom: 1, x: 0.5, y: 0.5 }; }), { small: true }),
    ], { open: false }),
    section('Filtry', [
      h('div', { class: 'btn-row' }, FILTER_PRESETS.map((p) =>
        button(p.name, () => app.store.update((d) => { d.elements[id].filters = { ...p.filters }; }), { small: true }))),
      ...filterSliders,
    ], { open: false }),
  ];
}

function qrSections(app, binder, el) {
  const id = el.id;
  const fg = colorField({ label: 'Kolor kodu', settings: app.settings, testId: 'el-qr-fg' });
  const bg = colorField({ label: 'Tło kodu', settings: app.settings });
  const style = segmented({ label: 'Styl modułów', options: options(QR_MODULE_STYLES) });
  const ecl = selectField({ label: 'Odporność na uszkodzenia', options: options(QR_ECL) });
  const margin = slider({ label: 'Margines (moduły)', min: 0, max: 6, step: 1 });
  const captionColor = colorField({ label: 'Kolor podpisu', settings: app.settings });
  const card = toggleField({ label: 'Biała karta pod kodem' });
  const cardRadius = slider({ label: 'Zaokrąglenie karty', min: 0, max: 80, step: 1, unit: ' px' });
  const warn = h('div');
  binder.watch((doc) => {
    const e = doc.elements[id];
    if (!e) return;
    const f = resolveColor(doc, e.fg, '#111111');
    const b = resolveColor(doc, e.bg, '#ffffff');
    const msgs = [];
    if (contrastRatio(f, b) < 3) msgs.push('⚠ Za mały kontrast — kod może się nie skanować.');
    else if (relativeLuminance(f) > relativeLuminance(b)) msgs.push('⚠ Jasny kod na ciemnym tle nie działa w części telefonów.');
    if (e.logoAssetId) msgs.push('Logo w środku wymusza najwyższą odporność (30%).');
    warn.replaceChildren(...msgs.map((m) => h('p', { class: m.startsWith('⚠') ? 'warning' : 'hint' }, m)));
  });
  const looks = bindAll(binder, [
    [fg, elProp(id, 'fg')], [bg, elProp(id, 'bg')], [style, elProp(id, 'moduleStyle')], [ecl, elProp(id, 'ecl')],
    [margin, elProp(id, 'margin')], [card, elProp(id, 'card')], [cardRadius, elProp(id, 'cardRadius')], [captionColor, elProp(id, 'captionColor')],
  ]);
  return [
    section('Kod QR — treść', qrDataEditor(app, binder, id)),
    section('Kod QR — wygląd', [
      ...looks,
      warn,
      h('div', { class: 'btn-row' },
        button(el.logoAssetId ? 'Zmień logo' : 'Dodaj logo w środku', () => app.actions.pickQrLogo(id), { small: true }),
        el.logoAssetId ? button('Usuń logo', () => app.actions.removeImage(id), { small: true, kind: 'ghost' }) : null),
    ]),
  ];
}

function imageSections(app, binder, el) {
  const id = el.id;
  const fit = segmented({ label: 'Dopasowanie', options: [{ value: 'contain', label: 'Cały obraz' }, { value: 'cover', label: 'Wypełnij' }] });
  const opacity = slider({ label: 'Przezroczystość', min: 0.05, max: 1, step: 0.05, format: (v) => Math.round(v * 100), unit: '%' });
  const radius = slider({ label: 'Zaokrąglenie', min: 0, max: 200, step: 1, unit: ' px' });
  return [section('Obraz', [
    h('div', { class: 'btn-row' },
      button(el.assetId ? 'Zmień obraz' : 'Wybierz obraz', () => app.actions.pickPhoto(id), { kind: 'primary' }),
      el.assetId ? button('Usuń obraz', () => app.actions.removeImage(id), { kind: 'ghost' }) : null),
    ...bindAll(binder, [[fit, elProp(id, 'fit')], [opacity, elProp(id, 'opacity')], [radius, elProp(id, 'radius')]]),
  ])];
}

function shapeSections(app, binder, el) {
  const id = el.id;
  const kind = segmented({ label: 'Kształt', options: options(SHAPE_KINDS) });
  const fill = colorField({ label: el.shape === 'line' ? 'Kolor linii' : 'Wypełnienie', settings: app.settings });
  const opacity = slider({ label: 'Przezroczystość', min: 0.05, max: 1, step: 0.05, format: (v) => Math.round(v * 100), unit: '%' });
  const pairs = [[kind, elProp(id, 'shape')], [fill, elProp(id, 'fill')], [opacity, elProp(id, 'opacity')]];
  if (el.shape !== 'line') {
    pairs.push(
      [colorField({ label: 'Kolor obrysu', settings: app.settings }), elProp(id, 'stroke')],
      [slider({ label: 'Grubość obrysu', min: 0, max: 30, step: 1, unit: ' px' }), elProp(id, 'strokeWidth')],
    );
  }
  if (el.shape === 'rect') pairs.push([slider({ label: 'Zaokrąglenie', min: 0, max: 300, step: 1, unit: ' px' }), elProp(id, 'radius')]);
  const parts = bindAll(binder, pairs);
  if (el.shape === 'line') parts.push(h('p', { class: 'hint' }, 'Grubość linii zmienisz górnym lub dolnym uchwytem.'));
  return [section('Kształt', parts)];
}

const TYPE_SECTIONS = {
  text: (app, binder, el) => [textStyleControls(app, binder, el, { withContent: true })],
  points: pointsSections,
  photo: photoSections,
  qr: qrSections,
  image: imageSections,
  shape: shapeSections,
};

// --- Widoki panelu ------------------------------------------------------------------

function emptyView(app) {
  return section('Nic nie zaznaczono', [
    h('p', { class: 'hint' }, 'Kliknij element na plakacie, aby zmienić jego wygląd. Shift+klik lub ramka zaznaczenia = kilka elementów.'),
    h('div', { class: 'btn-row' },
      button('+ Tekst', () => app.actions.addText(), { small: true }),
      button('+ Obraz', () => app.actions.addImageElement(), { small: true }),
      button('+ Kształt', () => app.actions.addShape('rect'), { small: true }),
      button('+ QR', () => app.actions.addQr(), { small: true })),
  ]);
}

function multiView(app, count) {
  const align = (mode, label) => button(label, () => app.actions.alignSelection(mode), { small: true });
  return [
    section(`Zaznaczone elementy: ${count}`, [
      h('div', { class: 'field-label' }, 'Wyrównaj'),
      h('div', { class: 'btn-row' }, align('left', '⇤ Lewo'), align('hcenter', '↔ Środek'), align('right', '⇥ Prawo')),
      h('div', { class: 'btn-row', style: { marginTop: '6px' } }, align('top', '⤒ Góra'), align('vcenter', '↕ Środek'), align('bottom', '⤓ Dół')),
      h('div', { class: 'field-label', style: { marginTop: '10px' } }, 'Rozłóż równomiernie'),
      h('div', { class: 'btn-row' },
        button('W poziomie', () => app.actions.distributeSelection('h'), { small: true }),
        button('W pionie', () => app.actions.distributeSelection('v'), { small: true })),
    ]),
    section('Akcje', [h('div', { class: 'btn-row' },
      button('Na wierzch', () => app.actions.reorderSelection('front'), { small: true }),
      button('Na spód', () => app.actions.reorderSelection('back'), { small: true }),
      button('Zablokuj / odblokuj', () => app.actions.toggleLockSelection(), { small: true }),
      button('Ukryj / pokaż', () => app.actions.toggleHiddenSelection(), { small: true }),
      button('Duplikuj', () => app.actions.duplicateSelection(), { small: true }),
      button('Usuń', () => app.actions.deleteSelection(), { small: true, kind: 'danger' }))]),
  ];
}

export const elementPanel = {
  id: 'element',
  label: 'Element',
  key(doc, selection) {
    const ids = selection.ids.filter((id) => doc.elements[id]);
    if (ids.length !== 1) return `n:${ids.join(',')}`;
    const el = doc.elements[ids[0]];
    const extra = {
      text: '',
      points: `${el.bullet}:${el.items?.length}:${el.autoFit}`,
      photo: `${el.assetId}:${el.shape}`,
      qr: `${el.kind}:${el.logoAssetId}`,
      image: `${el.assetId}`,
      shape: `${el.shape}`,
    }[el.type];
    return `1:${el.id}:${el.type}:${el.autoFit}:${extra}`;
  },
  render(root, { app, binder }) {
    const doc = app.store.doc;
    const ids = app.selection.ids.filter((id) => doc.elements[id]);
    if (!ids.length) {
      root.append(emptyView(app));
      return;
    }
    if (ids.length > 1) {
      root.append(...multiView(app, ids.length));
      return;
    }
    const el = doc.elements[ids[0]];
    root.append(
      headerSection(app, binder, el),
      ...TYPE_SECTIONS[el.type](app, binder, el),
      geometrySection(app, binder, el),
      arrangeSection(app, binder, el),
    );
  },
};
```

- [ ] **Step 2: Dodaj panel i akcję `focusElementField` w `src/ui/index.js`**

Zastąp cały plik:
```js
import { createBinder } from './binder.js';
import { installToolbar } from './toolbar.js';
import { installStatusbar } from './statusbar.js';
import { installSidebar } from './sidebar.js';
import { contentPanel } from './panels/content.js';
import { stylePanel } from './panels/style.js';
import { layoutPanel } from './panels/layout.js';
import { elementPanel } from './panels/element.js';
import { layersPanel } from './panels/layers.js';

export const PANELS = [contentPanel, stylePanel, layoutPanel, elementPanel, layersPanel];

export function installUI(app) {
  app.ui.binder = createBinder(app.store);
  installToolbar(app);
  installStatusbar(app);
  installSidebar(app, PANELS);
  app.actions.focusElementField = (id) => {
    app.ui.focusAfterRender = '[data-testid="el-text"], [data-testid="point-input-0"], [data-testid="qr-kind"]';
    app.selection.set([id]);
    app.ui.showTab('element');
  };
}
```

- [ ] **Step 3: Sprawdź ręcznie**

Run: `npm start`
Expected:
- Klik w tytuł przełącza na zakładkę „Element”: nazwa, treść, czcionka, rozmiar, styl; suwak „Rozmiar maksymalny” zmienia tekst na żywo, a cała seria ruchu suwaka cofa się jednym Ctrl+Z.
- Dwuklik w tytuł na plakacie ustawia kursor w polu „Treść”.
- Zdjęcie: zmiana kształtu na „Łuk”/„Sześciokąt”; „Zaokrąglenie rogów” widoczne tylko dla „Zaokrąglony”; filtry „Czarno-białe”, „Vintage” działają; suwaki „Kadr” przesuwają zdjęcie.
- QR: zmiana koloru kodu na jasnoszary pokazuje ostrzeżenie o kontraście; „Dodaj logo w środku” wstawia logo, a kod nadal się skanuje.
- Punkty: „Znacznik” → „Własny znak” pokazuje pole, wpisanie „🔥” zmienia znaczniki; „Równomiernie” rozkłada punkty na wysokość ramki.
- Kształt: „Linia” → zostają tylko uchwyty boczne i góra/dół.
- Zaznaczenie 3 elementów ramką → panel wyrównania; „⇤ Lewo” wyrównuje, „W pionie” rozkłada.
- Brak zaznaczenia → podpowiedź i szybkie przyciski dodawania.

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ui/panels/element.js src/ui/index.js
git commit -m "feat(ui): panel Element — styl tekstu, punktów, zdjęcia (kadr, filtry), QR, obrazów i kształtów; wyrównanie"
```

---
### Task 21: Biblioteki procesu głównego — zapis atomowy, ostatnie pliki, ustawienia, szablony, log

**Files:**
- Create: `electron/lib/atomicWrite.js`, `electron/lib/recent.js`, `electron/lib/settingsStore.js`, `electron/lib/templates.js`, `electron/lib/logger.js`
- Test: `tests/electron/atomicWrite.test.js`, `tests/electron/recent.test.js`, `tests/electron/settingsStore.test.js`, `tests/electron/templates.test.js`, `tests/electron/logger.test.js`

**Interfaces:**
- Consumes: `mergeSettings` z `src/core/settings.js` (czysty ESM — proces główny importuje go bezpośrednio).
- Produces:
  - `atomicWrite(filePath, data, { backup = false, retries = 3 }): Promise<void>` — plik tymczasowy + `fsync` + `rename` (z ponawianiem przy `EPERM/EBUSY/EACCES` — antywirus w Windows), opcjonalna kopia `.bak`
  - `readTextSafe(filePath): Promise<string | null>` (`null`, gdy plik nie istnieje)
  - `addRecent(list, filePath, max = 10): string[]`, `removeRecent(list, filePath): string[]` (porównanie bez wielkości liter — Windows)
  - `createSettingsStore(filePath)` → `{ load(): Promise<settings>, update(patch): Promise<settings> }` (zapisy kolejkowane)
  - `createTemplateStore(dir)` → `{ list(): Promise<{ id, name, thumb, createdAt }[]>, save({ name, project, thumb }): Promise<id>, read(id): Promise<string>, remove(id): Promise<void> }`
  - `formatLogLine(level, source, message, date)`, `createLogger(dir, { maxBytes })` → `{ file, error(source, msg), info(source, msg) }` (rotacja do `error.log.1`)

- [ ] **Step 1: Napisz testy**

`tests/electron/atomicWrite.test.js`:
```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { atomicWrite, readTextSafe } from '../../electron/lib/atomicWrite.js';

let dir;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'plakat-aw-')); });
afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

describe('atomicWrite', () => {
  it('zapisuje nowy plik i tworzy katalogi', async () => {
    const file = path.join(dir, 'a', 'b', 'x.txt');
    await atomicWrite(file, 'cześć');
    expect(await fs.readFile(file, 'utf8')).toBe('cześć');
  });
  it('nadpisuje z kopią .bak i nie zostawia plików tymczasowych', async () => {
    const file = path.join(dir, 'p.plakat');
    await atomicWrite(file, 'v1');
    await atomicWrite(file, 'v2', { backup: true });
    expect(await fs.readFile(file, 'utf8')).toBe('v2');
    expect(await fs.readFile(`${file}.bak`, 'utf8')).toBe('v1');
    const files = await fs.readdir(dir);
    expect(files.filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });
  it('zapisuje dane binarne', async () => {
    const file = path.join(dir, 'b.bin');
    await atomicWrite(file, Buffer.from([1, 2, 3]));
    expect([...(await fs.readFile(file))]).toEqual([1, 2, 3]);
  });
});

describe('readTextSafe', () => {
  it('null dla brakującego pliku', async () => {
    expect(await readTextSafe(path.join(dir, 'nie.txt'))).toBeNull();
  });
});
```

`tests/electron/recent.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { addRecent, removeRecent } from '../../electron/lib/recent.js';

describe('recent', () => {
  it('dodaje na początek bez duplikatów (bez wielkości liter)', () => {
    expect(addRecent(['C:\\a.plakat', 'C:\\b.plakat'], 'c:\\B.plakat')).toEqual(['c:\\B.plakat', 'C:\\a.plakat']);
  });
  it('pilnuje limitu', () => {
    const list = Array.from({ length: 10 }, (_, i) => `C:\\${i}.plakat`);
    expect(addRecent(list, 'C:\\nowy.plakat')).toHaveLength(10);
    expect(addRecent(list, 'C:\\nowy.plakat', 3)).toEqual(['C:\\nowy.plakat', 'C:\\0.plakat', 'C:\\1.plakat']);
  });
  it('usuwa', () => {
    expect(removeRecent(['C:\\A.plakat', 'C:\\b.plakat'], 'c:\\a.plakat')).toEqual(['C:\\b.plakat']);
  });
});
```

`tests/electron/settingsStore.test.js`:
```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createSettingsStore } from '../../electron/lib/settingsStore.js';
import { DEFAULT_SETTINGS } from '../../src/core/settings.js';

let dir;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'plakat-set-')); });
afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

describe('createSettingsStore', () => {
  it('domyślne, gdy brak pliku', async () => {
    expect(await createSettingsStore(path.join(dir, 's.json')).load()).toEqual(DEFAULT_SETTINGS);
  });
  it('zapisuje i wczytuje ponownie', async () => {
    const file = path.join(dir, 's.json');
    await createSettingsStore(file).update({ exportScale: 2, snap: false });
    const again = await createSettingsStore(file).load();
    expect(again.exportScale).toBe(2);
    expect(again.snap).toBe(false);
  });
  it('uszkodzony plik → domyślne', async () => {
    const file = path.join(dir, 's.json');
    await fs.writeFile(file, '{zepsute');
    expect(await createSettingsStore(file).load()).toEqual(DEFAULT_SETTINGS);
  });
  it('równoległe zmiany nie gubią się', async () => {
    const file = path.join(dir, 's.json');
    const store = createSettingsStore(file);
    await Promise.all([store.update({ exportScale: 3 }), store.update({ showGrid: true })]);
    const again = await createSettingsStore(file).load();
    expect(again.exportScale).toBe(3);
    expect(again.showGrid).toBe(true);
  });
});
```

`tests/electron/templates.test.js`:
```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createTemplateStore } from '../../electron/lib/templates.js';

let dir;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'plakat-tpl-')); });
afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

describe('createTemplateStore', () => {
  it('zapisuje, listuje, czyta i usuwa', async () => {
    const store = createTemplateStore(dir);
    const id = await store.save({ name: 'Promocja', project: '{"app":"plakat-maker"}', thumb: 'data:image/png;base64,AAAA' });
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id, name: 'Promocja', thumb: 'data:image/png;base64,AAAA' });
    expect(await store.read(id)).toBe('{"app":"plakat-maker"}');
    await store.remove(id);
    expect(await store.list()).toEqual([]);
  });
  it('odrzuca podejrzane identyfikatory i miniatury', async () => {
    const store = createTemplateStore(dir);
    await expect(store.read('..\\..\\windows')).rejects.toThrow(/identyfikator/);
    const id = await store.save({ name: 'X', project: '{}', thumb: 'javascript:alert(1)' });
    expect((await store.list())[0].thumb).toBeNull();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('pomija uszkodzone wpisy', async () => {
    const store = createTemplateStore(dir);
    await fs.writeFile(path.join(dir, 'zly.json'), '{nie');
    expect(await store.list()).toEqual([]);
  });
});
```

`tests/electron/logger.test.js`:
```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { formatLogLine, createLogger } from '../../electron/lib/logger.js';

let dir;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'plakat-log-')); });
afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

describe('logger', () => {
  it('formatuje linię', () => {
    expect(formatLogLine('ERROR', 'main', 'Boom \n', new Date('2026-10-30T10:00:00Z'))).toBe('2026-10-30T10:00:00.000Z [ERROR] main: Boom\n');
  });
  it('dopisuje i rotuje', async () => {
    const log = createLogger(dir, { maxBytes: 60 });
    await log.error('a', 'x'.repeat(50));
    await log.error('b', 'drugi');
    const current = await fs.readFile(log.file, 'utf8');
    const rotated = await fs.readFile(`${log.file}.1`, 'utf8');
    expect(rotated).toContain('[ERROR] a:');
    expect(current).toContain('[ERROR] b: drugi');
  });
});
```

- [ ] **Step 2: Uruchom — mają nie przejść**

Run: `npx vitest run tests/electron`
Expected: FAIL — brak modułów.

- [ ] **Step 3: Utwórz `electron/lib/atomicWrite.js`**

```js
import { promises as fs } from 'node:fs';
import path from 'node:path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRY_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
let counter = 0;

export async function atomicWrite(filePath, data, { backup = false, retries = 3 } = {}) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  counter = (counter + 1) % 100000;
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${counter}.tmp`);
  const handle = await fs.open(tmp, 'w');
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
  if (backup) {
    try {
      await fs.copyFile(filePath, `${filePath}.bak`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        await fs.rm(tmp, { force: true });
        throw err;
      }
    }
  }
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(tmp, filePath);
      return;
    } catch (err) {
      if (attempt >= retries || !RETRY_CODES.has(err.code)) {
        await fs.rm(tmp, { force: true });
        throw err;
      }
      await sleep(80 * (attempt + 1));
    }
  }
}

export async function readTextSafe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}
```

- [ ] **Step 4: Utwórz `electron/lib/recent.js`**

```js
const same = (a, b) => a.toLowerCase() === b.toLowerCase();

export function addRecent(list, filePath, max = 10) {
  return [filePath, ...list.filter((p) => !same(p, filePath))].slice(0, max);
}

export function removeRecent(list, filePath) {
  return list.filter((p) => !same(p, filePath));
}
```

- [ ] **Step 5: Utwórz `electron/lib/settingsStore.js`**

```js
import { mergeSettings } from '../../src/core/settings.js';
import { atomicWrite, readTextSafe } from './atomicWrite.js';

export function createSettingsStore(filePath) {
  let values = null;
  let loading = null;
  let queue = Promise.resolve();

  function load() {
    // Jedno wspólne wczytanie — równoległe wywołania nie nadpiszą sobie wartości.
    loading ??= (async () => {
      try {
        const text = await readTextSafe(filePath);
        values = mergeSettings(text ? JSON.parse(text) : {});
      } catch {
        values = mergeSettings({});
      }
      return values;
    })();
    return loading.then(() => values);
  }

  async function update(patch) {
    await load();
    values = mergeSettings({ ...values, ...(patch && typeof patch === 'object' ? patch : {}) });
    const snapshot = JSON.stringify(values, null, 2);
    queue = queue
      .then(() => atomicWrite(filePath, snapshot))
      .catch((err) => console.error('Nie udało się zapisać ustawień:', err));
    await queue;
    return values;
  }

  return { load, update };
}
```

- [ ] **Step 6: Utwórz `electron/lib/templates.js`**

```js
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicWrite } from './atomicWrite.js';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_THUMB = 2 * 1024 * 1024;

function assertId(id) {
  if (typeof id !== 'string' || !ID.test(id)) throw new Error('Nieprawidłowy identyfikator szablonu.');
}

export function createTemplateStore(dir) {
  return {
    async list() {
      await fs.mkdir(dir, { recursive: true });
      const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
      const out = [];
      for (const f of files) {
        try {
          const meta = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
          if (ID.test(meta.id)) out.push({ id: meta.id, name: String(meta.name ?? 'Szablon'), thumb: meta.thumb ?? null, createdAt: meta.createdAt ?? '' });
        } catch {
          /* uszkodzony wpis — pomijamy */
        }
      }
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async save({ name, project, thumb }) {
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const safeThumb = typeof thumb === 'string' && thumb.startsWith('data:image/') && thumb.length < MAX_THUMB ? thumb : null;
      await atomicWrite(path.join(dir, `${id}.plakat`), String(project));
      await atomicWrite(path.join(dir, `${id}.json`), JSON.stringify({ id, name: String(name ?? 'Szablon').slice(0, 80), thumb: safeThumb, createdAt }));
      return id;
    },

    async read(id) {
      assertId(id);
      return fs.readFile(path.join(dir, `${id}.plakat`), 'utf8');
    },

    async remove(id) {
      assertId(id);
      await fs.rm(path.join(dir, `${id}.plakat`), { force: true });
      await fs.rm(path.join(dir, `${id}.json`), { force: true });
    },
  };
}
```

- [ ] **Step 7: Utwórz `electron/lib/logger.js`**

```js
import { promises as fs } from 'node:fs';
import path from 'node:path';

export function formatLogLine(level, source, message, date = new Date()) {
  return `${date.toISOString()} [${level}] ${source}: ${String(message).replace(/\s+$/, '')}\n`;
}

export function createLogger(dir, { maxBytes = 1_000_000 } = {}) {
  const file = path.join(dir, 'error.log');
  let queue = Promise.resolve();

  function write(line) {
    queue = queue
      .then(async () => {
        await fs.mkdir(dir, { recursive: true });
        try {
          const stat = await fs.stat(file);
          if (stat.size + line.length > maxBytes) await fs.rename(file, `${file}.1`);
        } catch {
          /* brak pliku */
        }
        await fs.appendFile(file, line);
      })
      .catch(() => {});
    return queue;
  }

  return {
    file,
    error: (source, message) => write(formatLogLine('ERROR', source, message)),
    info: (source, message) => write(formatLogLine('INFO', source, message)),
  };
}
```

- [ ] **Step 8: Uruchom — mają przejść**

Run: `npm test`
Expected: PASS (wszystkie testy `core` i `electron`).

- [ ] **Step 9: Commit**

```bash
git add electron/lib tests/electron
git commit -m "feat(main): zapis atomowy z kopią .bak, ostatnie pliki, ustawienia, szablony i log błędów"
```

---
### Task 22: Proces główny, most IPC i projekty (nowy / otwórz / zapisz / zamykanie)

**Files:**
- Modify: `electron/main.js` (pełna nowa treść), `electron/preload.cjs` (pełna nowa treść)
- Create: `electron/ipc.js`, `src/renderer/project.js`
- Modify: `src/renderer/main.js`

**Interfaces:**
- Consumes: `atomicWrite`, `readTextSafe`, `addRecent`, `removeRecent`, `createSettingsStore`, `createTemplateStore`, `createLogger` (Zadanie 21), `serializeProject`, `parseProject`, `ProjectError` (schema), `newDocument` (document), `sanitizeFileName` (exportSizes), `confirmDialog`, `alertDialog`, `toast` (dialogs).
- Produces:
  - `window.api` (preload) — **pełna lista**: `isE2E`, `getSettings()`, `setSettings(patch)`, `openProjectDialog()` → `{ path, text } | null`, `readProject(path)` → `{ path, text }`, `saveProject({ filePath, text, saveAs, suggestedName })` → `path | null`, `pathForFile(file)` → `string | null`, `saveExport({ defaultName, ext, bytes })` → `path | null`, `saveExportMany({ files: [{ name, bytes }] })` → `folder | null`, `showItemInFolder(path)`, `copyImage(pngDataUrl)`, `autosaveWrite(text)`, `autosaveRead()` → `string | null`, `autosaveClear()`, `listTemplates()`, `readTemplate(id)`, `saveTemplate({ name, project, thumb })`, `deleteTemplate(id)`, `listRecent()`, `removeRecent(path)`, `setTitle(text)`, `setDirty(bool)`, `confirmClose()`, `startupFiles()` → `string[]`, `logError(message)`, `listDisplays()`, `present({ dataUrl, displayId })`, `onOpenFile(fn)`, `onCloseRequested(fn)`, `onPresentImage(fn)`
  - Zmienne środowiskowe (testy E2E): `PLAKAT_USER_DATA` (osobny katalog danych), `PLAKAT_E2E_DIR` (okna zapisu/otwarcia nie pokazują się — pliki trafiają do tego katalogu; brak pytania przy zamykaniu)
  - `renderer/project.js`: `installProject(app)` → akcje `newProject()`, `createProject(doc, assets)`, `openProject()`, `openProjectPath(path)`, `openProjectFile(file)`, `saveProject()`, `saveProjectAs()`, `openRecent()`; `app.project = { get filePath(), confirmDiscard(), openText(text, path, opts) }`; tablica `app.startupTasks` (funkcje uruchamiane po pierwszym renderze)

- [ ] **Step 1: Utwórz `electron/ipc.js`**

```js
import { app, dialog, ipcMain, shell, clipboard, nativeImage, screen } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { atomicWrite, readTextSafe } from './lib/atomicWrite.js';
import { addRecent, removeRecent } from './lib/recent.js';

const MAX_PROJECT_BYTES = 300 * 1024 * 1024;
const PROJECT_FILTER = [{ name: 'Projekt Plakat Maker', extensions: ['plakat'] }];
const EXPORT_FILTERS = {
  png: [{ name: 'Obraz PNG', extensions: ['png'] }],
  jpg: [{ name: 'Obraz JPG', extensions: ['jpg', 'jpeg'] }],
  pdf: [{ name: 'Dokument PDF', extensions: ['pdf'] }],
};

const isProjectPath = (p) => typeof p === 'string' && p.toLowerCase().endsWith('.plakat');
const toBuffer = (bytes) => Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));

export function registerIpc({ getWindow, settings, templates, logger, e2eDir, state }) {
  const autosaveFile = path.join(app.getPath('userData'), 'autosave.plakat.json');

  function handle(channel, fn) {
    ipcMain.handle(channel, async (event, ...args) => {
      if (!event.senderFrame?.url?.startsWith('file:')) throw new Error('Niedozwolone źródło wywołania.');
      try {
        return await fn(...args);
      } catch (err) {
        logger.error(`ipc:${channel}`, err?.stack ?? err);
        throw err;
      }
    });
  }

  async function remember(filePath) {
    const s = await settings.load();
    await settings.update({ recent: addRecent(s.recent, filePath), lastProjectDir: path.dirname(filePath) });
  }

  async function readProjectFile(filePath) {
    if (!isProjectPath(filePath)) throw new Error('To nie jest plik projektu .plakat.');
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_PROJECT_BYTES) throw new Error('Plik projektu jest zbyt duży.');
    const text = await fs.readFile(filePath, 'utf8');
    await remember(filePath);
    return { path: filePath, text };
  }

  handle('settings:get', () => settings.load());
  handle('settings:set', (patch) => settings.update(patch));

  handle('project:open', async () => {
    if (e2eDir) return readProjectFile(path.join(e2eDir, 'projekt.plakat'));
    const s = await settings.load();
    const res = await dialog.showOpenDialog(getWindow(), {
      title: 'Otwórz projekt',
      defaultPath: s.lastProjectDir || app.getPath('documents'),
      filters: PROJECT_FILTER,
      properties: ['openFile'],
    });
    return res.canceled || !res.filePaths[0] ? null : readProjectFile(res.filePaths[0]);
  });

  handle('project:read', (filePath) => readProjectFile(filePath));

  handle('project:save', async ({ filePath, text, saveAs, suggestedName }) => {
    let target = filePath;
    if (e2eDir) target = path.join(e2eDir, 'projekt.plakat');
    else if (!target || saveAs) {
      const s = await settings.load();
      const res = await dialog.showSaveDialog(getWindow(), {
        title: 'Zapisz projekt',
        defaultPath: path.join(s.lastProjectDir || app.getPath('documents'), `${suggestedName || 'plakat'}.plakat`),
        filters: PROJECT_FILTER,
      });
      if (res.canceled || !res.filePath) return null;
      target = res.filePath.toLowerCase().endsWith('.plakat') ? res.filePath : `${res.filePath}.plakat`;
    }
    await atomicWrite(target, String(text), { backup: true });
    await remember(target);
    return target;
  });

  handle('export:save', async ({ defaultName, ext, bytes }) => {
    const filters = EXPORT_FILTERS[ext];
    if (!filters) throw new Error('Nieznany format eksportu.');
    const s = await settings.load();
    let target = e2eDir ? path.join(e2eDir, path.basename(defaultName)) : null;
    if (!target) {
      const res = await dialog.showSaveDialog(getWindow(), {
        title: 'Zapisz plakat',
        defaultPath: path.join(s.lastExportDir || app.getPath('pictures'), path.basename(defaultName)),
        filters,
      });
      if (res.canceled || !res.filePath) return null;
      target = res.filePath;
    }
    await atomicWrite(target, toBuffer(bytes));
    await settings.update({ lastExportDir: path.dirname(target) });
    return target;
  });

  handle('export:saveMany', async ({ files }) => {
    const s = await settings.load();
    let dir = e2eDir;
    if (!dir) {
      const res = await dialog.showOpenDialog(getWindow(), {
        title: 'Wybierz folder na pliki plakatu',
        defaultPath: s.lastExportDir || app.getPath('pictures'),
        properties: ['openDirectory', 'createDirectory'],
      });
      if (res.canceled || !res.filePaths[0]) return null;
      dir = res.filePaths[0];
    }
    for (const f of files) await atomicWrite(path.join(dir, path.basename(f.name)), toBuffer(f.bytes));
    await settings.update({ lastExportDir: dir });
    return dir;
  });

  handle('shell:showItem', async (p) => {
    if (typeof p === 'string') shell.showItemInFolder(p);
  });

  handle('clipboard:writeImage', async (dataUrl) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png')) throw new Error('Nieprawidłowy obraz.');
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
  });

  handle('autosave:write', (text) => atomicWrite(autosaveFile, String(text)));
  handle('autosave:read', () => readTextSafe(autosaveFile));
  handle('autosave:clear', () => fs.rm(autosaveFile, { force: true }));

  handle('templates:list', () => templates.list());
  handle('templates:read', (id) => templates.read(id));
  handle('templates:save', (t) => templates.save(t));
  handle('templates:delete', (id) => templates.remove(id));

  handle('recent:list', async () => {
    const s = await settings.load();
    const existing = [];
    for (const p of s.recent) {
      try {
        await fs.access(p);
        existing.push(p);
      } catch {
        /* plik usunięty lub przeniesiony */
      }
    }
    return existing;
  });
  handle('recent:remove', async (p) => {
    const s = await settings.load();
    return (await settings.update({ recent: removeRecent(s.recent, String(p)) })).recent;
  });

  handle('app:setTitle', async (title) => {
    getWindow()?.setTitle(String(title).slice(0, 200));
  });
  handle('app:setDirty', async (dirty) => {
    state.dirty = !!dirty;
  });
  handle('app:confirmClose', async () => {
    state.forceClose = true;
    getWindow()?.close();
  });
  handle('app:startupFiles', async () => state.takeStartupFiles());
  handle('log:error', async (message) => {
    await logger.error('renderer', String(message).slice(0, 8000));
  });

  handle('displays:list', async () => {
    const primary = screen.getPrimaryDisplay();
    return screen.getAllDisplays().map((d, i) => ({
      id: d.id,
      label: `Ekran ${i + 1}${d.id === primary.id ? ' (główny)' : ''} — ${d.size.width}×${d.size.height}`,
      width: d.size.width,
      height: d.size.height,
      scaleFactor: d.scaleFactor,
      primary: d.id === primary.id,
    }));
  });

  return { handle };
}
```

- [ ] **Step 2: Zastąp `electron/preload.cjs`**

```js
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
const on = (channel, fn) => {
  const listener = (_event, ...args) => fn(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('api', {
  isE2E: process.argv.includes('--plakat-e2e'),
  getSettings: () => invoke('settings:get'),
  setSettings: (patch) => invoke('settings:set', patch),
  openProjectDialog: () => invoke('project:open'),
  readProject: (filePath) => invoke('project:read', filePath),
  saveProject: (opts) => invoke('project:save', opts),
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file) || null;
    } catch {
      return null;
    }
  },
  saveExport: (opts) => invoke('export:save', opts),
  saveExportMany: (opts) => invoke('export:saveMany', opts),
  showItemInFolder: (p) => invoke('shell:showItem', p),
  copyImage: (dataUrl) => invoke('clipboard:writeImage', dataUrl),
  autosaveWrite: (text) => invoke('autosave:write', text),
  autosaveRead: () => invoke('autosave:read'),
  autosaveClear: () => invoke('autosave:clear'),
  listTemplates: () => invoke('templates:list'),
  readTemplate: (id) => invoke('templates:read', id),
  saveTemplate: (t) => invoke('templates:save', t),
  deleteTemplate: (id) => invoke('templates:delete', id),
  listRecent: () => invoke('recent:list'),
  removeRecent: (p) => invoke('recent:remove', p),
  setTitle: (title) => invoke('app:setTitle', title),
  setDirty: (dirty) => invoke('app:setDirty', dirty),
  confirmClose: () => invoke('app:confirmClose'),
  startupFiles: () => invoke('app:startupFiles'),
  logError: (message) => invoke('log:error', message),
  listDisplays: () => invoke('displays:list'),
  present: (opts) => invoke('present:open', opts),
  onOpenFile: (fn) => on('app:openFile', fn),
  onCloseRequested: (fn) => on('app:closeRequested', fn),
  onPresentImage: (fn) => on('present:image', fn),
});
```

- [ ] **Step 3: Zastąp `electron/main.js`**

```js
import { app, BrowserWindow, Menu, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpc } from './ipc.js';
import { createSettingsStore } from './lib/settingsStore.js';
import { createTemplateStore } from './lib/templates.js';
import { createLogger } from './lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.PLAKAT_USER_DATA) app.setPath('userData', process.env.PLAKAT_USER_DATA);
const E2E_DIR = process.env.PLAKAT_E2E_DIR || null;
const isProjectArg = (a) => typeof a === 'string' && a.toLowerCase().endsWith('.plakat');

const logger = createLogger(path.join(app.getPath('userData'), 'logs'));
let mainWindow = null;
let rendererHealthy = true;
const startupFiles = process.argv.slice(1).filter(isProjectArg);

const state = {
  dirty: false,
  forceClose: false,
  takeStartupFiles() {
    return startupFiles.splice(0, startupFiles.length);
  },
};

process.on('uncaughtException', (err) => logger.error('main', err?.stack ?? err));
process.on('unhandledRejection', (err) => logger.error('main', err?.stack ?? err));

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#14161c',
    title: 'Plakat Maker',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
      additionalArguments: E2E_DIR ? ['--plakat-e2e'] : [],
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.on('before-input-event', (_event, input) => {
    if (!app.isPackaged && input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools();
  });

  win.on('close', (event) => {
    if (state.dirty && !state.forceClose && !E2E_DIR && rendererHealthy) {
      event.preventDefault();
      win.webContents.send('app:closeRequested');
    }
  });

  win.webContents.on('render-process-gone', async (_event, details) => {
    logger.error('renderer-gone', JSON.stringify(details));
    if (details.reason === 'clean-exit' || state.forceClose) return;
    rendererHealthy = false;
    const { response } = await dialog.showMessageBox(win, {
      type: 'error',
      title: 'Plakat Maker',
      message: 'Okno programu przestało działać.',
      detail: 'Twoja praca jest zapisywana automatycznie. Wczytać okno ponownie i odzyskać pracę?',
      buttons: ['Wczytaj ponownie', 'Zamknij program'],
      defaultId: 0,
    });
    if (response === 0) {
      rendererHealthy = true;
      win.reload();
    } else {
      state.forceClose = true;
      win.close();
    }
  });

  win.on('unresponsive', async () => {
    rendererHealthy = false;
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      title: 'Plakat Maker',
      message: 'Program nie odpowiada.',
      detail: 'Możesz poczekać albo wczytać okno ponownie (praca jest zapisywana automatycznie).',
      buttons: ['Czekaj', 'Wczytaj ponownie'],
      defaultId: 0,
    });
    if (response === 1) win.webContents.forcefullyCrashRenderer();
  });
  win.on('responsive', () => {
    rendererHealthy = true;
  });

  win.on('closed', () => {
    mainWindow = null;
  });
  return win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    const file = argv.slice(1).find(isProjectArg);
    if (file) mainWindow.webContents.send('app:openFile', file);
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('pl.plakatmaker.app');
    Menu.setApplicationMenu(null);
    const settings = createSettingsStore(path.join(app.getPath('userData'), 'settings.json'));
    const templates = createTemplateStore(path.join(app.getPath('userData'), 'templates'));
    registerIpc({ getWindow: () => mainWindow, settings, templates, logger, e2eDir: E2E_DIR, state });
    mainWindow = createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
```

(`win.on('close')` przepuszcza zamknięcie, gdy renderer nie działa — inaczej zawieszone okno nie dałoby się zamknąć.)

- [ ] **Step 4: Utwórz `src/renderer/project.js`**

```js
import { serializeProject, parseProject, ProjectError } from '../core/schema.js';
import { newDocument } from '../core/document.js';
import { sanitizeFileName } from '../core/exportSizes.js';
import { confirmDialog, alertDialog, toast, openModal } from '../ui/dialogs.js';
import { h } from '../ui/dom.js';

const baseName = (p) => (p ? p.split(/[\\/]/).pop() : null);

export function installProject(app) {
  const { api, store, selection } = app;
  let filePath = null;
  app.startupTasks ??= [];

  function refreshTitle() {
    const name = baseName(filePath) ?? `${store.doc.meta.name} (niezapisany)`;
    api.setTitle?.(`${store.dirty ? '● ' : ''}${name} — Plakat Maker`);
    api.setDirty?.(store.dirty);
  }
  store.subscribe(refreshTitle);

  function load(doc, assets, path, { dirty = false } = {}) {
    selection.clear();
    store.replace(doc, assets, { dirty });
    filePath = path;
    app.editor.fit();
    refreshTitle();
  }

  async function save({ saveAs = false } = {}) {
    if (!api.saveProject) {
      toast('Zapis jest niedostępny w tej wersji.', { type: 'error' });
      return false;
    }
    try {
      const text = serializeProject(store.doc, store.assets);
      const saved = await api.saveProject({ filePath, text, saveAs, suggestedName: sanitizeFileName(store.doc.meta.name) });
      if (!saved) return false;
      filePath = saved;
      store.markSaved();
      await api.autosaveClear?.();
      refreshTitle();
      toast(`Zapisano: ${baseName(saved)}`, { type: 'success' });
      return true;
    } catch (err) {
      await alertDialog('Nie udało się zapisać', `${err.message}\n\nSpróbuj „Zapisz jako…” w innym folderze.`);
      return false;
    }
  }

  async function confirmDiscard() {
    if (!store.dirty) return true;
    const choice = await confirmDialog({
      title: 'Niezapisane zmiany',
      message: 'Projekt ma niezapisane zmiany. Zapisać je przed kontynuacją?',
      buttons: [
        { id: 'cancel', label: 'Anuluj' },
        { id: 'discard', label: 'Nie zapisuj', kind: 'danger' },
        { id: 'save', label: 'Zapisz', kind: 'primary' },
      ],
    });
    if (choice === 'save') return save();
    return choice === 'discard';
  }

  async function openText(text, path, { dirty = false, quiet = false } = {}) {
    try {
      const { doc, assets, warnings } = parseProject(text);
      load(doc, assets, path, { dirty });
      if (warnings.length) {
        toast(`Projekt wczytany z poprawkami: ${warnings[0]}${warnings.length > 1 ? ` (i ${warnings.length - 1} więcej)` : ''}`, { timeout: 7000 });
      } else if (!quiet) {
        toast(`Otwarto: ${baseName(path) ?? doc.meta.name}`, { type: 'success' });
      }
      return true;
    } catch (err) {
      const message = err instanceof ProjectError ? err.message : `Nie udało się otworzyć projektu: ${err.message}`;
      await alertDialog('Nie można otworzyć projektu', message);
      return false;
    }
  }

  async function openPath(path) {
    try {
      const res = await api.readProject(path);
      await openText(res.text, res.path);
    } catch (err) {
      await alertDialog('Nie można otworzyć pliku', `${err.message}`);
    }
  }

  app.project = {
    get filePath() { return filePath; },
    confirmDiscard,
    openText,
  };

  Object.assign(app.actions, {
    async newProject() {
      if (!(await confirmDiscard())) return;
      if (app.actions.showNewProjectDialog) await app.actions.showNewProjectDialog();
      else app.actions.createProject(newDocument(), {});
    },
    createProject(doc, assets = {}) {
      load(doc, assets, null);
    },
    async openProject() {
      if (!(await confirmDiscard())) return;
      try {
        const res = await api.openProjectDialog?.();
        if (res) await openText(res.text, res.path);
      } catch (err) {
        await alertDialog('Nie można otworzyć pliku', err.message);
      }
    },
    async openProjectPath(path) {
      if (!(await confirmDiscard())) return;
      await openPath(path);
    },
    async openProjectFile(file) {
      if (!(await confirmDiscard())) return;
      await openText(await file.text(), api.pathForFile?.(file) ?? null);
    },
    async openRecent() {
      const list = (await api.listRecent?.()) ?? [];
      if (!list.length) {
        toast('Brak ostatnio otwieranych projektów.');
        return;
      }
      const modal = openModal({
        title: 'Ostatnie projekty',
        body: h('div', { class: 'layer-list' }, list.map((p) =>
          h('div', { class: 'layer-row', title: p, onClick: () => { modal.close(null); app.actions.openProjectPath(p); } },
            h('span', { class: 'layer-name' }, baseName(p)),
            h('span', { class: 'hint' }, p.length > 60 ? `…${p.slice(-58)}` : p)))),
        actions: [{ id: null, label: 'Zamknij' }],
      });
    },
    saveProject: () => save(),
    saveProjectAs: () => save({ saveAs: true }),
  });

  api.onOpenFile?.((path) => app.actions.openProjectPath(path));
  api.onCloseRequested?.(async () => {
    if (await confirmDiscard()) {
      await api.autosaveClear?.();
      api.confirmClose();
    }
  });

  app.startupTasks.push(async () => {
    const files = (await api.startupFiles?.()) ?? [];
    if (files.length) await app.actions.openProjectPath(files[0]);
  });
  refreshTitle();
}
```

- [ ] **Step 5: Podłącz w `src/renderer/main.js`**

Dodaj import pod `import { installShortcuts } from '../ui/shortcuts.js';`:
```js
import { installProject } from './project.js';
```
Zmień listę na:
```js
const FEATURES = [installImages, installInteraction, installCommands, installShortcuts, installProject, installUI];
```
W funkcji `start()` zamień:
```js
  const app = { api, settings, store, selection, editor, actions: {}, ui: {} };
```
na:
```js
  const app = { api, settings, store, selection, editor, actions: {}, ui: {}, startupTasks: [] };
```
i zaraz po linii `document.body.dataset.ready = 'true';` dopisz:
```js
  for (const task of app.startupTasks) {
    try {
      await task();
    } catch (err) {
      console.error('Błąd zadania startowego:', err);
    }
  }
```

- [ ] **Step 6: Sprawdź ręcznie**

Run: `npm start`
Expected:
- W pasku pojawia się menu „Plik ▾” (Nowy, Otwórz, Ostatnie, Zapisz, Zapisz jako) i przycisk „Zapisz”. Tytuł okna: „● Plakat (niezapisany) — Plakat Maker” po pierwszej zmianie.
- Ctrl+S → okno zapisu w „Dokumenty” z nazwą `Plakat.plakat`; po zapisie tytuł bez „●”, pasek stanu „✓ Zapisano”. Drugi zapis nie pyta o ścieżkę i tworzy obok `Plakat.plakat.bak`.
- Ctrl+O otwiera zapisany plik (ze zdjęciem). Przeciągnięcie pliku `.plakat` na okno też go otwiera.
- Zamknięcie okna z niezapisanymi zmianami → okno „Zapisać zmiany?”; „Anuluj” zostawia program otwarty.
- Plik `.plakat` zmieniony ręcznie na śmieci (`{zepsute`) → czytelny komunikat „Plik projektu jest uszkodzony…”, program działa dalej.
- Uruchomienie drugiej kopii programu tylko przywraca pierwsze okno.

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add electron src/renderer/project.js src/renderer/main.js
git commit -m "feat: proces główny z IPC, zapis/odczyt projektów, ostatnie pliki, ochrona przed utratą zmian"
```

---
### Task 23: Autozapis, odzyskiwanie pracy i globalna obsługa błędów

**Files:**
- Create: `src/renderer/autosave.js`, `src/renderer/errors.js`
- Modify: `src/renderer/main.js`

**Interfaces:**
- Consumes: `projectToObject` (schema), `AUTOSAVE_DELAY_MS` (constants), `confirmDialog`, `toast` (dialogs), `app.project.openText` i `app.project.filePath` (Zadanie 22), `api.autosaveWrite/Read/Clear`, `api.logError`, `app.ui.status` (Zadanie 17), ustawienie `autosave`.
- Produces:
  - `installAutosave(app)` — zapis do `userData/autosave.plakat.json` najpóźniej 3 s po zmianie (throttle, nie debounce — ciągła praca też jest zapisywana), dodatkowo przy utracie fokusu okna; czyszczony po zapisie projektu; zadanie startowe „Odzyskiwanie pracy” (na początku `app.startupTasks`)
  - Format autozapisu: `{ autosave: 1, savedAt: ISO, path: string|null, project: projectToObject(...) }`
  - `installErrorHandling(app)` — `window.error` i `unhandledrejection` → log w `error.log` + komunikat (najwyżej raz na 5 s)

- [ ] **Step 1: Utwórz `src/renderer/autosave.js`**

```js
import { projectToObject } from '../core/schema.js';
import { AUTOSAVE_DELAY_MS } from '../core/constants.js';
import { confirmDialog, toast } from '../ui/dialogs.js';

export function installAutosave(app) {
  const { api, store, settings } = app;
  if (!api.autosaveWrite) return;
  let timer = null;
  let writing = false;
  let again = false;

  async function write() {
    clearTimeout(timer);
    timer = null;
    if (!store.dirty || !settings.get('autosave')) return;
    if (writing) {
      again = true;
      return;
    }
    writing = true;
    try {
      const payload = JSON.stringify({
        autosave: 1,
        savedAt: new Date().toISOString(),
        path: app.project?.filePath ?? null,
        project: projectToObject(store.doc, store.assets),
      });
      await api.autosaveWrite(payload);
      app.ui.status?.set('autosave', `Autozapis ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
    } catch (err) {
      console.warn('Autozapis nie powiódł się:', err);
      app.ui.status?.set('autosave', '⚠ Autozapis nie powiódł się');
    } finally {
      writing = false;
      if (again) {
        again = false;
        schedule();
      }
    }
  }

  function schedule() {
    if (!timer) timer = setTimeout(write, AUTOSAVE_DELAY_MS);
  }

  store.subscribe((_doc, change) => {
    if (change.reason === 'saved') {
      clearTimeout(timer);
      timer = null;
      app.ui.status?.set('autosave', '');
      return;
    }
    if (store.dirty) schedule();
  });
  window.addEventListener('blur', () => {
    if (store.dirty) write();
  });

  app.startupTasks.unshift(async () => {
    let text;
    try {
      text = await api.autosaveRead();
    } catch {
      return;
    }
    if (!text) return;
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      await api.autosaveClear();
      return;
    }
    if (data?.autosave !== 1 || !data.project) {
      await api.autosaveClear();
      return;
    }
    const when = new Date(data.savedAt).toLocaleString('pl-PL');
    const file = data.path ? ` (${data.path.split(/[\\/]/).pop()})` : '';
    const choice = await confirmDialog({
      title: 'Odzyskiwanie pracy',
      message: `Znaleziono niezapisaną pracę z ${when}${file}.\nPrzywrócić ją?`,
      buttons: [
        { id: 'discard', label: 'Odrzuć', kind: 'danger' },
        { id: 'restore', label: 'Przywróć', kind: 'primary' },
      ],
    });
    if (choice === 'discard') {
      await api.autosaveClear();
      return;
    }
    if (choice !== 'restore') return; // Esc — zostawiamy plik na później
    const ok = await app.project.openText(JSON.stringify(data.project), data.path ?? null, { dirty: true, quiet: true });
    if (ok) toast('Przywrócono niezapisaną pracę. Zapisz ją (Ctrl+S).', { type: 'success', timeout: 6000 });
  });
}
```

- [ ] **Step 2: Utwórz `src/renderer/errors.js`**

```js
import { toast } from '../ui/dialogs.js';

export function installErrorHandling(app) {
  let lastToast = 0;
  function report(err, origin) {
    const message = err?.stack ?? err?.message ?? String(err);
    console.error(origin, err);
    app.api.logError?.(`${origin}: ${message}`)?.catch?.(() => {});
    const now = Date.now();
    if (now - lastToast > 5000) {
      lastToast = now;
      toast('Wystąpił nieoczekiwany błąd. Praca jest zapisywana automatycznie — jeśli coś wygląda źle, użyj Ctrl+Z.', { type: 'error', timeout: 7000 });
    }
  }
  window.addEventListener('error', (e) => report(e.error ?? e.message, 'window.error'));
  window.addEventListener('unhandledrejection', (e) => report(e.reason, 'unhandledrejection'));
}
```

- [ ] **Step 3: Podłącz w `src/renderer/main.js`**

Dodaj importy pod `import { installProject } from './project.js';`:
```js
import { installAutosave } from './autosave.js';
import { installErrorHandling } from './errors.js';
```
Zmień listę na (obsługa błędów pierwsza, autozapis po projektach, UI na końcu):
```js
const FEATURES = [
  installErrorHandling, installImages, installInteraction, installCommands, installShortcuts,
  installProject, installAutosave, installUI,
];
```
W bloku `start().catch(...)` dopisz zapis do logu — zamień całość na:
```js
start().catch((err) => {
  console.error(err);
  window.api?.logError?.(`start: ${err?.stack ?? err}`);
  document.getElementById('statusbar').textContent = `Błąd uruchamiania: ${err.message}`;
});
```

- [ ] **Step 4: Sprawdź ręcznie**

Run: `npm start`
Expected:
- Po zmianie tytułu w ciągu ~3 s w pasku stanu pojawia się „Autozapis 12:34:56”.
- Zamknij proces twardo (Menedżer zadań → „Zakończ zadanie” na Plakat Maker / electron) i uruchom ponownie → okno „Odzyskiwanie pracy” → „Przywróć” odtwarza zmiany (z tytułem „●”).
- Po Ctrl+S i ponownym uruchomieniu okno odzyskiwania się nie pojawia.
- W konsoli (F12) `setTimeout(() => { throw new Error('test') })` → czerwony komunikat; w `%APPDATA%\plakat-maker\logs\error.log` jest wpis `[ERROR] renderer: window.error: Error: test`.

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/autosave.js src/renderer/errors.js src/renderer/main.js
git commit -m "feat: autozapis z odzyskiwaniem po awarii i globalna obsługa błędów z logiem"
```

---
### Task 24: Eksport — PNG, JPG, PDF, obie orientacje, schowek

**Files:**
- Create: `src/canvas/exporter.js`, `src/ui/exportDialog.js`
- Modify: `src/renderer/main.js`

**Interfaces:**
- Consumes: `editor.withExportView` (Zadanie 12), `whenImagesReady` (imageCache), `EXPORT_SCALES`, `exportDims`, `pdfPage`, `exportFileName`, `sanitizeFileName` (exportSizes), `findByRole` (document), `qrValidationError` (qr), `api.saveExport`, `api.saveExportMany`, `api.copyImage`, `api.showItemInFolder`, kontrolki (Zadanie 17), ustawienia `exportFormat`, `exportScale`, `exportOrientation`, `jpgQuality`, `pdfMode`.
- Produces:
  - `exporter.js`: `dataUrlToBytes(dataUrl): Uint8Array`, `renderPoster(editor, store, { orientation, scale = 1, mime = 'image/png', quality = 0.92 }): Promise<string>` (dowolna skala — używa też pokaz), `buildPdf(pages: { dataUrl, format, mime }[], mode, title): Uint8Array`, `exportPoster(app, opts): Promise<string | null>` (ścieżka/folder albo `null` przy anulowaniu)
  - `exportDialog.js`: `installExport(app)` → akcje `openExport()`, `copyToClipboard()`; `preflightWarnings(doc, assets): string[]`
  - `data-testid`: `export-format-{png|jpg|pdf}`, `export-scale`, `export-orientation-{current|landscape|portrait|both}`, `export-confirm`, `export-copy`

- [ ] **Step 1: Utwórz `src/canvas/exporter.js`**

```js
import { jsPDF } from 'jspdf';
import { pdfPage, exportFileName, sanitizeFileName } from '../core/exportSizes.js';
import { whenImagesReady } from './imageCache.js';

export function dataUrlToBytes(dataUrl) {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function renderPoster(editor, store, { orientation, scale = 1, mime = 'image/png', quality = 0.92 }) {
  const doc = { ...store.doc, orientation };
  await whenImagesReady(doc, store.assets);
  await document.fonts.ready;
  const f = doc.formats[orientation];
  return editor.withExportView(
    (stage) => stage.toDataURL({ mimeType: mime, quality, pixelRatio: scale, x: 0, y: 0, width: f.w, height: f.h }),
    { doc, quality: 'full' },
  );
}

export function buildPdf(pages, mode, title) {
  let pdf = null;
  for (const p of pages) {
    const page = pdfPage(p.format, mode);
    const size = [page.pageW, page.pageH];
    if (!pdf) {
      pdf = new jsPDF({ unit: page.unit, format: size, orientation: page.orientation, compress: true, hotfixes: ['px_scaling'] });
    } else {
      pdf.addPage(size, page.orientation);
    }
    pdf.addImage(p.dataUrl, p.mime === 'image/png' ? 'PNG' : 'JPEG', page.x, page.y, page.w, page.h, undefined, 'FAST');
  }
  pdf.setProperties({ title, creator: 'Plakat Maker' });
  return new Uint8Array(pdf.output('arraybuffer'));
}

export async function exportPoster(app, { format, scale, orientation, jpgQuality, pdfMode }) {
  const { store, editor, api } = app;
  const orientations = orientation === 'both'
    ? ['landscape', 'portrait']
    : [orientation === 'current' ? store.doc.orientation : orientation];
  const name = store.doc.meta.name;
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'pdf' ? 0.95 : jpgQuality;
  const renders = [];
  for (const o of orientations) {
    renders.push({
      orientation: o,
      format: store.doc.formats[o],
      mime,
      dataUrl: await renderPoster(editor, store, { orientation: o, scale, mime, quality }),
    });
  }
  if (format === 'pdf') {
    const fileName = renders.length > 1 ? `${sanitizeFileName(name)}.pdf` : exportFileName(name, renders[0].orientation, 'pdf');
    return api.saveExport({ defaultName: fileName, ext: 'pdf', bytes: buildPdf(renders, pdfMode, name) });
  }
  if (renders.length === 1) {
    return api.saveExport({ defaultName: exportFileName(name, renders[0].orientation, format), ext: format, bytes: dataUrlToBytes(renders[0].dataUrl) });
  }
  return api.saveExportMany({
    files: renders.map((r) => ({ name: exportFileName(name, r.orientation, format), bytes: dataUrlToBytes(r.dataUrl) })),
  });
}
```

- [ ] **Step 2: Utwórz `src/ui/exportDialog.js`**

```js
import { h } from './dom.js';
import { segmented, selectField, slider } from './controls.js';
import { openModal, toast } from './dialogs.js';
import { EXPORT_SCALES, exportDims } from '../core/exportSizes.js';
import { findByRole } from '../core/document.js';
import { qrValidationError } from '../core/qr.js';
import { exportPoster, renderPoster } from '../canvas/exporter.js';

export function preflightWarnings(doc) {
  const warnings = [];
  for (const o of ['landscape', 'portrait']) {
    const photo = findByRole(doc, 'photo');
    if (photo && !photo.assetId && !doc.boxes[o][photo.id]?.hidden) {
      warnings.push('Nie dodano zdjęcia — w jego miejscu będzie puste tło ramki.');
      break;
    }
  }
  for (const el of Object.values(doc.elements)) {
    if (el.type === 'qr' && qrValidationError(el.kind, el.data)) {
      warnings.push(`„${el.name}”: ${qrValidationError(el.kind, el.data)} Kod nie pojawi się na plakacie.`);
    }
  }
  const title = findByRole(doc, 'title');
  if (title && title.text === 'Twój tytuł') warnings.push('Tytuł ma nadal tekst przykładowy.');
  return warnings;
}

export function installExport(app) {
  const { store, settings, api } = app;
  if (!api.saveExport) return;

  async function copyToClipboard() {
    try {
      const dataUrl = await renderPoster(app.editor, store, { orientation: store.doc.orientation, scale: 1 });
      await api.copyImage(dataUrl);
      toast('Skopiowano plakat do schowka — wklej go np. w Wordzie lub komunikatorze.', { type: 'success' });
    } catch (err) {
      toast(`Nie udało się skopiować: ${err.message}`, { type: 'error' });
    }
  }

  function openExport() {
    const values = {
      format: settings.get('exportFormat'),
      scale: settings.get('exportScale'),
      orientation: settings.get('exportOrientation'),
      jpgQuality: settings.get('jpgQuality'),
      pdfMode: settings.get('pdfMode'),
    };
    const doc = store.doc;
    const format = segmented({
      label: 'Format pliku',
      options: [{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'pdf', label: 'PDF' }],
      testId: 'export-format',
    });
    const orientation = segmented({
      label: 'Orientacja',
      options: [
        { value: 'current', label: 'Bieżąca' },
        { value: 'landscape', label: 'Pozioma' },
        { value: 'portrait', label: 'Pionowa' },
        { value: 'both', label: 'Obie' },
      ],
      testId: 'export-orientation',
    });
    const scale = selectField({ label: 'Rozdzielczość', options: [], testId: 'export-scale' });
    const quality = slider({ label: 'Jakość JPG', min: 0.6, max: 1, step: 0.02, format: (v) => Math.round(v * 100), unit: '%' });
    const pdfMode = selectField({
      label: 'Strona PDF',
      options: [{ value: 'screen', label: 'Rozmiar ekranu (jak obraz)' }, { value: 'a4', label: 'A4 do druku (z marginesem)' }],
    });
    const preview = h('img', { class: 'thumb', style: { height: '160px', objectFit: 'contain', background: '#0d0f13' }, alt: 'Podgląd' });
    const busy = h('p', { class: 'hint' });

    function refresh() {
      format.set(values.format);
      orientation.set(values.orientation);
      const o = values.orientation === 'current' || values.orientation === 'both' ? doc.orientation : values.orientation;
      scale.input.replaceChildren(...EXPORT_SCALES.map((s) => {
        const d = exportDims(doc.formats[o], s.value);
        return h('option', { value: String(s.value) }, `${s.label} — ${d.width} × ${d.height} px`);
      }));
      scale.set(values.scale);
      quality.set(values.jpgQuality);
      pdfMode.set(values.pdfMode);
      quality.el.hidden = values.format !== 'jpg';
      pdfMode.el.hidden = values.format !== 'pdf';
    }
    format.onChange((v) => { values.format = v; refresh(); });
    orientation.onChange((v) => { values.orientation = v; refresh(); });
    scale.onChange((v) => { values.scale = Number(v); });
    quality.onChange((v) => { values.jpgQuality = v; });
    pdfMode.onChange((v) => { values.pdfMode = v; });
    refresh();

    renderPoster(app.editor, store, { orientation: doc.orientation, scale: 320 / doc.formats[doc.orientation].w, mime: 'image/jpeg', quality: 0.8 })
      .then((url) => { preview.src = url; })
      .catch(() => {});

    const warnings = preflightWarnings(doc);
    const modal = openModal({
      title: 'Eksport plakatu',
      body: h('div', {},
        preview,
        warnings.map((w) => h('p', { class: 'warning' }, `⚠ ${w}`)),
        h('div', { class: 'two-col' }, h('div', {}, format.el, scale.el), h('div', {}, orientation.el, quality.el, pdfMode.el)),
        h('p', { class: 'hint' }, 'Na telewizor lub monitor Full HD wystarczy 1×. Dla ekranów 4K wybierz 2×. „Obie” zapisze wersję poziomą i pionową naraz.'),
        busy),
      actions: [
        { id: 'copy', label: 'Kopiuj do schowka', testId: 'export-copy', onClick: () => copyToClipboard() },
        { id: null, label: 'Anuluj' },
        {
          id: 'export',
          label: 'Eksportuj',
          kind: 'primary',
          testId: 'export-confirm',
          onClick: async (m) => {
            busy.textContent = 'Przygotowuję plik…';
            m.element.querySelectorAll('button').forEach((b) => { b.disabled = true; });
            await settings.set({
              exportFormat: values.format,
              exportScale: values.scale,
              exportOrientation: values.orientation,
              jpgQuality: values.jpgQuality,
              pdfMode: values.pdfMode,
            });
            try {
              const saved = await exportPoster(app, values);
              m.close('done');
              if (saved) {
                const many = values.orientation === 'both' && values.format !== 'pdf';
                const name = saved.split(/[\\/]/).pop();
                toast(many ? `Zapisano 2 pliki w folderze „${name}”` : `Zapisano: ${name}`, {
                  type: 'success',
                  timeout: 7000,
                  action: { label: 'Pokaż w folderze', onClick: () => api.showItemInFolder(saved) },
                });
              }
            } catch (err) {
              m.close('error');
              toast(`Eksport nie powiódł się: ${err.message}`, { type: 'error', timeout: 8000 });
            }
          },
        },
      ],
    });
    return modal;
  }

  app.actions.openExport = openExport;
  app.actions.copyToClipboard = copyToClipboard;
}
```

- [ ] **Step 3: Podłącz w `src/renderer/main.js`**

Dodaj import pod `import { installErrorHandling } from './errors.js';`:
```js
import { installExport } from '../ui/exportDialog.js';
```
Zmień listę na:
```js
const FEATURES = [
  installErrorHandling, installImages, installInteraction, installCommands, installShortcuts,
  installProject, installAutosave, installExport, installUI,
];
```

- [ ] **Step 4: Sprawdź ręcznie**

Run: `npm start`
Expected:
- Pasek narzędzi ma „Eksportuj”; Ctrl+E otwiera okno z podglądem i ostrzeżeniami (brak zdjęcia, tytuł przykładowy).
- PNG 1× bieżąca → zapis `Plakat-poziomo.png` (1920×1080, sprawdź we Właściwościach pliku → Szczegóły); toast „Pokaż w folderze” otwiera Eksplorator z zaznaczonym plikiem.
- PNG 2× „Obie” → wybór folderu → dwa pliki 3840×2160 i 2160×3840.
- JPG z jakością 70% → mniejszy plik.
- PDF „A4 do druku” → plik otwiera się w przeglądarce PDF, plakat wyśrodkowany na stronie A4; „Obie” → PDF z dwiema stronami.
- Na plikach nie ma uchwytów, siatki, ramki bezpiecznej ani napisów zastępczych; kod QR jest ostry także przy 3×.
- „Kopiuj do schowka” → Ctrl+V w Paint wkleja plakat.

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/canvas/exporter.js src/ui/exportDialog.js src/renderer/main.js
git commit -m "feat: eksport PNG/JPG/PDF w skali 1–3×, obie orientacje naraz, kopiowanie do schowka"
```

---
### Task 25: Szablony i okno „Nowy projekt” (z ekranem powitalnym)

**Files:**
- Create: `src/ui/newProjectDialog.js`
- Modify: `src/renderer/main.js`

**Interfaces:**
- Consumes: `STARTERS`, `newDocument` (document), `getTheme` (themes), `computeLayout`, `LAYOUT_ROLES` (layouts), `FORMAT_PRESETS` (constants), `parseProject`, `serializeProject` (schema), `renderPoster` (Zadanie 24), `api.listTemplates/readTemplate/saveTemplate/deleteTemplate`, `app.actions.createProject`, `app.project.filePath`, ustawienie `showWelcome`.
- Produces: `starterPreviewSvg(starter, orientation, format): string`, `installTemplates(app)` → akcje `showNewProjectDialog({ welcome })`, `saveAsTemplate()`; zadanie startowe pokazujące okno powitalne (gdy `showWelcome`, brak otwartego pliku i nie jest to test E2E); `data-testid`: `new-<id startera lub szablonu>`, `new-create`, `new-orientation-*`.

- [ ] **Step 1: Utwórz `src/ui/newProjectDialog.js`**

```js
import { h } from './dom.js';
import { segmented, selectField, toggleField } from './controls.js';
import { openModal, confirmDialog, promptDialog, toast } from './dialogs.js';
import { STARTERS, newDocument } from '../core/document.js';
import { getTheme } from '../core/themes.js';
import { computeLayout, LAYOUT_ROLES } from '../core/layouts.js';
import { FORMAT_PRESETS } from '../core/constants.js';
import { parseProject, serializeProject } from '../core/schema.js';
import { renderPoster } from '../canvas/exporter.js';

export function starterPreviewSvg(starter, orientation, format) {
  const p = getTheme(starter.themeId).palette;
  const boxes = computeLayout(starter.layoutId, format, orientation);
  const colors = { photo: '#8a94a8', panel: p.bg2, accent: p.accent, title: p.text, subtitle: p.muted, points: p.muted, qr: '#ffffff', footer: p.muted };
  const order = starter.layoutId === 'card'
    ? ['panel', 'photo', ...LAYOUT_ROLES.filter((r) => r !== 'panel' && r !== 'photo')]
    : LAYOUT_ROLES;
  const rects = order.filter((r) => !boxes[r].hidden).map((r) => {
    const b = boxes[r];
    const height = r === 'title' ? b.h * 0.55 : r === 'points' ? b.h * 0.8 : b.h;
    return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${height}" rx="${r === 'photo' ? 30 : 10}" fill="${colors[r]}"${r === 'panel' ? ' opacity="0.85"' : ''}/>`;
  });
  return `<svg viewBox="0 0 ${format.w} ${format.h}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%"><rect width="${format.w}" height="${format.h}" fill="${p.bg}"/>${rects.join('')}</svg>`;
}

export function installTemplates(app) {
  const { api, store, settings } = app;

  async function showNewProjectDialog({ welcome = false } = {}) {
    const state = { kind: 'starter', id: STARTERS[0].id, orientation: 'landscape', formatId: '16:9' };
    let userTemplates = [];
    try {
      userTemplates = (await api.listTemplates?.()) ?? [];
    } catch (err) {
      console.warn('Nie udało się wczytać szablonów:', err);
    }

    let starterCards = [];
    let userCards = [];
    let modal = null;

    const formatSelect = selectField({ label: 'Format', options: FORMAT_PRESETS.map((p) => ({ value: p.id, label: p.label })) });
    const orientation = segmented({
      label: 'Orientacja',
      options: [{ value: 'landscape', label: '▭ Pozioma' }, { value: 'portrait', label: '▯ Pionowa' }],
      testId: 'new-orientation',
    });

    function select(kind, id) {
      state.kind = kind;
      state.id = id;
      for (const c of [...starterCards, ...userCards]) c.classList.toggle('active', c.dataset.kind === kind && c.dataset.id === id);
      formatSelect.input.disabled = kind === 'user';
    }

    function card(kind, id, name, preview) {
      return h('div', {
        class: 'card',
        dataset: { kind, id },
        'data-testid': `new-${id}`,
        onClick: () => select(kind, id),
        onDblclick: () => create(),
      }, h('div', { class: 'card-preview', style: { height: '90px' } }, preview), h('div', { class: 'card-name' }, name));
    }

    const starterGrid = h('div', { class: 'card-grid three' });
    function drawStarters() {
      const format = FORMAT_PRESETS.find((p) => p.id === state.formatId)[state.orientation];
      starterCards = STARTERS.map((s) => card('starter', s.id, s.name, h('div', { style: { width: '100%', height: '100%' }, html: starterPreviewSvg(s, state.orientation, format) })));
      starterGrid.replaceChildren(...starterCards);
      select(state.kind, state.id);
    }

    userCards = userTemplates.map((t) => {
      const c = card('user', t.id, t.name, t.thumb
        ? h('img', { src: t.thumb, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } })
        : h('span', { class: 'hint' }, 'Brak podglądu'));
      c.append(h('button', {
        type: 'button',
        class: 'btn small danger card-delete',
        title: 'Usuń szablon',
        onClick: async (e) => {
          e.stopPropagation();
          const answer = await confirmDialog({
            title: 'Usunąć szablon?',
            message: `Szablon „${t.name}” zostanie trwale usunięty.`,
            buttons: [{ id: 'cancel', label: 'Anuluj' }, { id: 'delete', label: 'Usuń', kind: 'danger' }],
          });
          if (answer !== 'delete') return;
          await api.deleteTemplate(t.id);
          c.remove();
          userCards = userCards.filter((x) => x !== c);
          if (state.kind === 'user' && state.id === t.id) select('starter', STARTERS[0].id);
        },
      }, '✕'));
      return c;
    });

    orientation.set(state.orientation);
    orientation.onChange((v) => {
      state.orientation = v;
      orientation.set(v);
      drawStarters();
    });
    formatSelect.set(state.formatId);
    formatSelect.onChange((v) => {
      state.formatId = v;
      drawStarters();
    });

    async function create() {
      try {
        let doc;
        let assets = {};
        if (state.kind === 'starter') {
          const s = STARTERS.find((x) => x.id === state.id);
          doc = newDocument({ themeId: s.themeId, layoutId: s.layoutId, formatId: state.formatId, orientation: state.orientation });
        } else {
          ({ doc, assets } = parseProject(await api.readTemplate(state.id)));
          doc.orientation = state.orientation;
        }
        modal.close('created');
        app.actions.createProject(doc, assets);
      } catch (err) {
        toast(`Nie udało się utworzyć projektu: ${err.message}`, { type: 'error' });
      }
    }

    const welcomeToggle = toggleField({ label: 'Pokazuj to okno przy starcie programu' });
    welcomeToggle.set(settings.get('showWelcome'));
    welcomeToggle.onChange((v) => settings.set({ showWelcome: v }));

    modal = openModal({
      title: welcome ? 'Witaj w Plakat Maker! Wybierz szablon na start' : 'Nowy projekt',
      size: 'wide',
      body: h('div', {},
        h('div', { class: 'two-col' }, orientation.el, formatSelect.el),
        h('div', { class: 'field-label' }, 'Szablony startowe (motyw + układ — wszystko zmienisz później)'),
        starterGrid,
        userCards.length ? [h('div', { class: 'field-label', style: { marginTop: '12px' } }, 'Moje szablony'), h('div', { class: 'card-grid three' }, userCards)] : null,
        welcome ? welcomeToggle.el : null),
      actions: [
        { id: null, label: welcome ? 'Pomiń' : 'Anuluj' },
        { label: 'Utwórz', kind: 'primary', testId: 'new-create', onClick: () => create() },
      ],
    });
    drawStarters();
  }

  async function saveAsTemplate() {
    const name = await promptDialog({ title: 'Zapisz jako szablon', label: 'Nazwa szablonu', value: store.doc.meta.name });
    if (!name) return;
    try {
      const f = store.doc.formats[store.doc.orientation];
      const thumb = await renderPoster(app.editor, store, { orientation: store.doc.orientation, scale: 360 / f.w, mime: 'image/jpeg', quality: 0.8 });
      await api.saveTemplate({ name, project: serializeProject(store.doc, store.assets), thumb });
      toast(`Zapisano szablon „${name}”. Znajdziesz go w oknie „Nowy projekt”.`, { type: 'success' });
    } catch (err) {
      toast(`Nie udało się zapisać szablonu: ${err.message}`, { type: 'error' });
    }
  }

  app.actions.showNewProjectDialog = showNewProjectDialog;
  if (api.saveTemplate) app.actions.saveAsTemplate = saveAsTemplate;

  app.startupTasks.push(async () => {
    if (!api.isE2E && settings.get('showWelcome') && !store.dirty && !app.project?.filePath) {
      await showNewProjectDialog({ welcome: true });
    }
  });
}
```

- [ ] **Step 2: Podłącz w `src/renderer/main.js`**

Dodaj import pod `import { installExport } from '../ui/exportDialog.js';`:
```js
import { installTemplates } from '../ui/newProjectDialog.js';
```
Zmień listę na:
```js
const FEATURES = [
  installErrorHandling, installImages, installInteraction, installCommands, installShortcuts,
  installProject, installAutosave, installExport, installTemplates, installUI,
];
```

- [ ] **Step 3: Sprawdź ręcznie**

Run: `npm start`
Expected:
- Przy starcie: „Witaj w Plakat Maker!” z 8 kolorowymi miniaturami starterów; przełącznik „Pionowa” zmienia miniatury; dwuklik w „Neon — baner” tworzy projekt.
- „Pomiń” zostawia domyślny plakat; odznaczenie „Pokazuj to okno przy starcie” wyłącza powitanie przy kolejnym uruchomieniu.
- „Plik ▾ → Zapisz jako szablon…” → nazwa → toast; Ctrl+N → w sekcji „Moje szablony” jest miniatura; utworzenie z niego odtwarza plakat ze zdjęciem.
- ✕ na szablonie → pytanie → „Usuń”; Esc w pytaniu zamyka tylko pytanie.
- Ctrl+N przy niezapisanych zmianach najpierw pyta o zapis.

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ui/newProjectDialog.js src/renderer/main.js
git commit -m "feat: okno Nowy projekt z 8 starterami, własne szablony z miniaturami i ekran powitalny"
```

---
### Task 26: Pokaz pełnoekranowy na wybranym monitorze (F5)

**Files:**
- Create: `electron/present.js`, `src/present.html`, `src/renderer/present.js`, `src/renderer/presentation.js`
- Modify: `electron/main.js`, `src/renderer/main.js`

**Interfaces:**
- Consumes: `registerIpc(...)` zwraca `{ handle }` (Zadanie 22), `renderPoster` (Zadanie 24), `presentationScale` (exportSizes), `api.listDisplays`, `api.present`, `api.onPresentImage`, `openModal`, `toast`.
- Produces:
  - `electron/present.js`: `registerPresent({ handle, preloadPath, htmlPath })` — kanał `present:open` (`{ dataUrl, displayId }`): pełnoekranowe okno bez ramki na wskazanym ekranie
  - `src/renderer/presentation.js`: `installPresentation(app)` → akcja `present()` (przy wielu ekranach pyta, na którym pokazać; domyślnie drugi ekran — zwykle telewizor)
  - Okno pokazu: Esc lub dwuklik zamyka; kursor ukryty; obraz renderowany w natywnej rozdzielczości ekranu

- [ ] **Step 1: Utwórz `electron/present.js`**

```js
import { BrowserWindow, screen } from 'electron';

export function registerPresent({ handle, preloadPath, htmlPath }) {
  let win = null;

  handle('present:open', async ({ dataUrl, displayId }) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) throw new Error('Nieprawidłowy obraz pokazu.');
    const display = screen.getAllDisplays().find((d) => d.id === displayId) ?? screen.getPrimaryDisplay();
    if (win && !win.isDestroyed()) win.close();
    win = new BrowserWindow({
      ...display.bounds,
      fullscreen: true,
      frame: false,
      show: false,
      backgroundColor: '#000000',
      title: 'Pokaz — Plakat Maker',
      webPreferences: { preload: preloadPath, contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event) => event.preventDefault());
    win.on('closed', () => {
      win = null;
    });
    await win.loadFile(htmlPath);
    win.webContents.send('present:image', dataUrl);
    win.show();
    win.focus();
  });
}
```

- [ ] **Step 2: Utwórz `src/present.html`**

```html
<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src data:; style-src 'unsafe-inline'; script-src 'self'">
  <title>Pokaz — Plakat Maker</title>
  <style>
    html, body { margin: 0; height: 100%; background: #000; overflow: hidden; cursor: none; }
    img { width: 100vw; height: 100vh; object-fit: contain; display: block; }
    .hint { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); color: #fff; background: rgba(0,0,0,.65);
      padding: 8px 14px; border-radius: 8px; font: 15px 'Segoe UI', sans-serif; transition: opacity .6s; }
  </style>
</head>
<body>
  <img id="poster" alt="">
  <div class="hint" id="hint">Esc lub dwuklik — zakończ pokaz</div>
  <script src="../dist/present.js"></script>
</body>
</html>
```

- [ ] **Step 3: Utwórz `src/renderer/present.js`**

```js
const img = document.getElementById('poster');
const hint = document.getElementById('hint');

window.api?.onPresentImage((dataUrl) => {
  img.src = dataUrl;
});
setTimeout(() => {
  hint.style.opacity = '0';
}, 2500);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.close();
});
window.addEventListener('dblclick', () => window.close());
```

(Plik jest automatycznie dołączany przez `build.mjs` jako `dist/present.js`, bo build sprawdza jego istnienie.)

- [ ] **Step 4: Utwórz `src/renderer/presentation.js`**

```js
import { renderPoster } from '../canvas/exporter.js';
import { presentationScale } from '../core/exportSizes.js';
import { openModal, toast } from '../ui/dialogs.js';
import { h } from '../ui/dom.js';

function chooseDisplay(displays) {
  return new Promise((resolve) => {
    const preferred = displays.find((d) => !d.primary) ?? displays[0];
    const modal = openModal({
      title: 'Na którym ekranie pokazać plakat?',
      size: 'small',
      body: h('div', { class: 'layer-list' }, displays.map((d) =>
        h('div', { class: `layer-row${d.id === preferred.id ? ' selected' : ''}`, onClick: () => modal.close(d) },
          h('span', { class: 'layer-name' }, d.label)))),
      actions: [{ id: null, label: 'Anuluj' }, { label: 'Pokaż', kind: 'primary', onClick: (m) => m.close(preferred) }],
      onClose: resolve,
    });
  });
}

export function installPresentation(app) {
  const { api, store, editor } = app;
  if (!api.present) return;

  app.actions.present = async () => {
    const displays = (await api.listDisplays()) ?? [];
    if (!displays.length) return;
    const display = displays.length > 1 ? await chooseDisplay(displays) : displays[0];
    if (!display) return;
    const doc = store.doc;
    const format = doc.formats[doc.orientation];
    const screenLandscape = display.width >= display.height;
    if (screenLandscape !== (format.w >= format.h)) {
      toast(`Plakat jest ${format.w >= format.h ? 'poziomy' : 'pionowy'}, a ekran ${screenLandscape ? 'poziomy' : 'pionowy'}. Przełącz orientację (Ctrl+1 / Ctrl+2) lub obróć ekran.`, { timeout: 7000 });
    }
    const scale = Math.min(3, Math.max(0.25, presentationScale(format, display)));
    try {
      const dataUrl = await renderPoster(editor, store, { orientation: doc.orientation, scale });
      await api.present({ dataUrl, displayId: display.id });
    } catch (err) {
      toast(`Nie udało się uruchomić pokazu: ${err.message}`, { type: 'error' });
    }
  };
}
```

- [ ] **Step 5: Zarejestruj kanał w `electron/main.js`**

Dodaj import pod `import { registerIpc } from './ipc.js';`:
```js
import { registerPresent } from './present.js';
```
W `app.whenReady().then(...)` zamień linię:
```js
    registerIpc({ getWindow: () => mainWindow, settings, templates, logger, e2eDir: E2E_DIR, state });
```
na:
```js
    const { handle } = registerIpc({ getWindow: () => mainWindow, settings, templates, logger, e2eDir: E2E_DIR, state });
    registerPresent({
      handle,
      preloadPath: path.join(__dirname, 'preload.cjs'),
      htmlPath: path.join(__dirname, '..', 'src', 'present.html'),
    });
```

- [ ] **Step 6: Podłącz w `src/renderer/main.js`**

Dodaj import pod `import { installTemplates } from '../ui/newProjectDialog.js';`:
```js
import { installPresentation } from './presentation.js';
```
Zmień listę na:
```js
const FEATURES = [
  installErrorHandling, installImages, installInteraction, installCommands, installShortcuts,
  installProject, installAutosave, installExport, installTemplates, installPresentation, installUI,
];
```

- [ ] **Step 7: Sprawdź ręcznie**

Run: `npm start`
Expected:
- F5 (lub „▶ Pokaz”) przy jednym ekranie: plakat na pełnym ekranie, czarne pasy przy innych proporcjach, napis „Esc lub dwuklik — zakończ pokaz” znika po 2,5 s; Esc wraca do edytora.
- Przy dwóch ekranach (np. TV przez HDMI): okno wyboru z domyślnie zaznaczonym ekranem dodatkowym; plakat ostry w natywnej rozdzielczości ekranu.
- Pionowy plakat na poziomym ekranie → podpowiedź o orientacji.

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add electron/present.js electron/main.js src/present.html src/renderer/present.js src/renderer/presentation.js src/renderer/main.js
git commit -m "feat: pokaz pełnoekranowy (F5) na wybranym monitorze"
```

---
### Task 27: Test E2E (Playwright + Electron)

**Files:**
- Create: `playwright.config.js`, `e2e/smoke.spec.js`

**Interfaces:**
- Consumes: zmienne `PLAKAT_E2E_DIR`, `PLAKAT_USER_DATA` (Zadanie 22), `window.__plakat` w trybie E2E (Zadanie 12), `data-testid` z Zadań 17, 22, 24, 25.
- Produces: `npm run e2e` — buduje aplikację i uruchamia test dymny całego przepływu.

- [ ] **Step 1: Utwórz `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  workers: 1,
  reporter: 'list',
});
```

- [ ] **Step 2: Napisz test `e2e/smoke.spec.js`**

```js
import { test, expect, _electron as electron } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const titleText = (page) => page.evaluate(() =>
  Object.values(window.__plakat.store.doc.elements).find((e) => e.role === 'title')?.text);

test('tworzy plakat, eksportuje obie orientacje i PDF, zapisuje i wczytuje projekt', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plakat-e2e-'));
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, PLAKAT_E2E_DIR: dir, PLAKAT_USER_DATA: path.join(dir, 'userdata') },
  });
  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForSelector('body[data-ready="true"]');

    // Treść
    await page.getByTestId('tab-content').click();
    await page.getByTestId('title-input').fill('Dzień otwarty');
    await page.getByTestId('point-input-0').fill('Bezpłatne warsztaty');
    await page.getByTestId('qr-url').fill('mojaszkola.pl');
    await expect.poll(() => titleText(page)).toBe('Dzień otwarty');

    // Motyw i układ
    await page.getByTestId('tab-style').click();
    await page.getByTestId('theme-las').click();
    await page.getByTestId('tab-layout').click();
    await page.getByTestId('layout-photo-top').click();
    await expect.poll(() => page.evaluate(() => window.__plakat.store.doc.layoutId)).toBe('photo-top');

    // Eksport PNG — obie orientacje
    await page.getByTestId('btn-export').click();
    await page.getByTestId('export-format-png').click();
    await page.getByTestId('export-orientation-both').click();
    await page.getByTestId('export-confirm').click();
    const landscape = path.join(dir, 'Plakat-poziomo.png');
    const portrait = path.join(dir, 'Plakat-pionowo.png');
    await expect.poll(() => fs.existsSync(landscape) && fs.existsSync(portrait), { timeout: 30_000 }).toBe(true);
    expect(pngSize(landscape)).toEqual({ w: 1920, h: 1080 });
    expect(pngSize(portrait)).toEqual({ w: 1080, h: 1920 });

    // Eksport PDF — bieżąca orientacja
    await page.getByTestId('btn-export').click();
    await page.getByTestId('export-format-pdf').click();
    await page.getByTestId('export-orientation-current').click();
    await page.getByTestId('export-confirm').click();
    const pdf = path.join(dir, 'Plakat-poziomo.pdf');
    await expect.poll(() => fs.existsSync(pdf), { timeout: 30_000 }).toBe(true);
    expect(fs.readFileSync(pdf).subarray(0, 4).toString()).toBe('%PDF');

    // Zapis projektu
    await page.keyboard.press('Control+S');
    const project = path.join(dir, 'projekt.plakat');
    await expect.poll(() => fs.existsSync(project)).toBe(true);
    await expect(page.getByTestId('status-dirty')).toHaveText('✓ Zapisano');
    const saved = JSON.parse(fs.readFileSync(project, 'utf8'));
    expect(saved.app).toBe('plakat-maker');
    expect(Object.values(saved.doc.elements).find((e) => e.role === 'title').text).toBe('Dzień otwarty');

    // Zmiana, cofnięcie i ponowne otwarcie
    await page.getByTestId('tab-content').click();
    await page.getByTestId('title-input').fill('Zmieniony tytuł');
    await expect.poll(() => titleText(page)).toBe('Zmieniony tytuł');
    await page.keyboard.press('Control+O');
    await page.getByTestId('confirm-discard').click();
    await expect.poll(() => titleText(page)).toBe('Dzień otwarty');
    expect(await page.evaluate(() => window.__plakat.store.doc.themeId)).toBe('las');

    expect(errors).toEqual([]);
  } finally {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: Uruchom test**

(Dla Electrona nie trzeba instalować przeglądarek Playwrighta.)

Run: `npm run e2e`
Expected: `1 passed`. Jeśli test nie przechodzi, przeczytaj komunikat Playwrighta (pokazuje krok i wartość) i popraw kod aplikacji — nie test.

Uwaga: `Ctrl+O` w trybie E2E otwiera `projekt.plakat` z katalogu testu bez okna dialogowego; przy niezapisanych zmianach najpierw pojawia się pytanie z przyciskiem `confirm-discard` („Nie zapisuj”).

- [ ] **Step 4: Commit**

```bash
git add playwright.config.js e2e
git commit -m "test(e2e): przepływ tworzenia, eksportu PNG/PDF, zapisu i ponownego otwarcia projektu"
```

---
### Task 28: Pakowanie do .exe, ikona, instrukcja i końcowa weryfikacja

**Files:**
- Create: `scripts/make-icon.cjs`, `README.md`
- Modify: `package.json` (sekcja `build`)

**Interfaces:**
- Consumes: wszystko powyżej.
- Produces: `npm run icon` → `build/icon.png` (512×512); `npm run dist` → `release/PlakatMaker-1.0.0-portable.exe` (bez instalacji) i `release/PlakatMaker-1.0.0-instalator.exe` (instalator z powiązaniem plików `.plakat`).

- [ ] **Step 1: Utwórz `scripts/make-icon.cjs`**

```js
// Uruchamiane przez: npm run icon  (electron scripts/make-icon.cjs)
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const draw = `
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, '#4f8cff'); g.addColorStop(1, '#7b3fe4');
  x.fillStyle = g; x.beginPath(); x.roundRect(16, 16, 480, 480, 96); x.fill();
  x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(96, 112, 320, 288, 28); x.fill();
  x.fillStyle = '#c7d6ff'; x.beginPath(); x.roundRect(120, 136, 120, 168, 18); x.fill();
  x.fillStyle = '#4f8cff'; x.fillRect(264, 144, 120, 22);
  x.fillStyle = '#9aa1b2'; for (let i = 0; i < 4; i++) x.fillRect(264, 186 + i * 28, 104 - i * 12, 12);
  x.fillStyle = '#111111'; for (const [a, b] of [[300, 320], [340, 320], [300, 352], [356, 356]]) x.fillRect(a, b, 24, 24);
  c.toDataURL('image/png');
`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('data:text/html,<html></html>');
  const dataUrl = await win.webContents.executeJavaScript(draw);
  const out = path.join(__dirname, '..', 'build', 'icon.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('Zapisano', out);
  app.quit();
});
```

- [ ] **Step 2: Wygeneruj ikonę**

Run: `npm run icon`
Expected: `Zapisano …\build\icon.png`; plik 512×512 z niebiesko-fioletowym tłem i miniaturą plakatu.

- [ ] **Step 3: Dodaj konfigurację pakowania do `package.json`**

Dopisz na najwyższym poziomie obiektu (obok `scripts`):
```json
  "build": {
    "appId": "pl.plakatmaker.app",
    "productName": "Plakat Maker",
    "copyright": "Plakat Maker",
    "directories": { "output": "release", "buildResources": "build" },
    "files": [
      "package.json",
      "electron/**",
      "src/index.html",
      "src/present.html",
      "src/core/**",
      "dist/**",
      "!**/*.map"
    ],
    "fileAssociations": [
      { "ext": "plakat", "name": "Projekt Plakat Maker", "description": "Projekt plakatu", "role": "Editor", "icon": "build/icon.png" }
    ],
    "win": { "target": ["portable", "nsis"], "icon": "build/icon.png" },
    "portable": { "artifactName": "PlakatMaker-${version}-portable.exe" },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "shortcutName": "Plakat Maker",
      "artifactName": "PlakatMaker-${version}-instalator.exe"
    }
  }
```

(`src/core/**` jest potrzebne, bo proces główny importuje `src/core/settings.js`. Wszystkie zależności są w `devDependencies`, więc `node_modules` nie trafia do paczki — renderer jest już zbundlowany w `dist/`.)

- [ ] **Step 4: Zbuduj paczki**

Run: `npm run dist`
Expected: w `release/` powstają `PlakatMaker-1.0.0-portable.exe` i `PlakatMaker-1.0.0-instalator.exe` (każdy ok. 90–110 MB). Ostrzeżenie o braku podpisu cyfrowego jest normalne.

- [ ] **Step 5: Utwórz `README.md` (instrukcja po polsku)**

````markdown
# Plakat Maker

Program do tworzenia plakatów na ekrany (TV, monitory) — w poziomie i w pionie. Zdjęcie, tytuł, kilka punktów i kod QR, z pełną swobodą wyglądu. Działa bez internetu.

## Szybki start
1. Uruchom `PlakatMaker-1.0.0-portable.exe` (bez instalacji) albo zainstaluj `PlakatMaker-1.0.0-instalator.exe`.
2. Wybierz szablon startowy (możesz zmienić wszystko później).
3. Przeciągnij swoje zdjęcie na plakat albo wklej je (Ctrl+V).
4. W zakładce **Treść** wpisz tytuł, punkty i adres dla kodu QR.
5. **Eksportuj** (Ctrl+E) do PNG, JPG lub PDF — albo od razu pokaż na ekranie (F5).

## Co potrafi
- **Poziom i pion** w jednym projekcie — każda orientacja ma własny układ, wspólną treść; eksport obu naraz.
- **6 układów** (zdjęcie z lewej/prawej, w tle, karta, pół na pół, baner) i **10 motywów**.
- **Przeciąganie myszką** z przyciąganiem do środka, krawędzi i innych elementów, obrót, zmiana rozmiaru, zaznaczanie wielu elementów, wyrównywanie.
- **Zdjęcie**: kształty (prostokąt, zaokrąglony, koło, łuk, sześciokąt), ramka, cień, kadrowanie myszą (dwuklik), filtry (czarno-białe, sepia, jasność, kontrast, nasycenie, rozmycie) i gotowe style.
- **Kolory**: paleta motywu, pipeta z ekranu, ostatnio użyte kolory, **„Kolory ze zdjęcia”**, ostrzeżenia o słabym kontraście.
- **14 czcionek z polskimi znakami** + czcionki systemowe; auto-dopasowanie rozmiaru tekstu do ramki.
- **Punkty** (do 6): kropki, ptaszki, numery, strzałki, gwiazdki lub własny znak/emoji.
- **Kod QR**: link, tekst, Wi-Fi, e-mail, telefon, wizytówka; style modułów, kolory, logo w środku, podpis.
- **Tło**: kolor, gradient, gradient radialny, zdjęcie (rozmycie, przyciemnienie), wzory.
- Dodatkowe teksty, obrazy (np. logo), kształty i linie; warstwy z blokowaniem i ukrywaniem.
- **Eksport** PNG/JPG/PDF w 1×, 2× (4K), 3×; PDF w rozmiarze ekranu lub A4; kopiowanie do schowka.
- **Pokaz pełnoekranowy** na wybranym monitorze (F5).
- **Własne szablony**, ostatnie projekty, **autozapis co kilka sekund** i odzyskiwanie po awarii, pytanie o zapis przy zamykaniu.

## Skróty klawiszowe
Pełna lista: **F1** w programie. Najważniejsze: Ctrl+S zapisz · Ctrl+Z / Ctrl+Y cofnij/ponów · Ctrl+D duplikuj · Delete usuń · strzałki przesuwają (Shift = 10 px) · Ctrl+1 / Ctrl+2 poziom/pion · Ctrl+E eksport · F5 pokaz · Ctrl + kółko zoom · Spacja + przeciąganie przesuwa widok · Alt podczas przeciągania wyłącza przyciąganie.

## Gdzie są moje dane
- Projekty: pliki `.plakat` tam, gdzie je zapiszesz (obok powstaje kopia `.bak` poprzedniej wersji).
- Autozapis, ustawienia, własne szablony i log błędów: `%APPDATA%\plakat-maker\` (folder `logs\error.log`).

## Dla programistów
```
npm install
npm start          # uruchom w trybie deweloperskim (F12 = narzędzia)
npm test           # testy jednostkowe (Vitest)
npm run e2e        # test end-to-end (Playwright + Electron)
npm run dist       # paczki .exe w folderze release/
```
````

- [ ] **Step 6: Końcowa weryfikacja**

Run: `npm test`
Expected: wszystkie testy PASS.

Run: `npm run e2e`
Expected: `1 passed`.

Ręcznie, na zbudowanym `release/PlakatMaker-1.0.0-portable.exe` (lista kontrolna):
- [ ] Start bez internetu (wyłącz Wi-Fi): czcionki i wszystkie funkcje działają.
- [ ] Ekran powitalny → starter → zdjęcie przeciągnięte z Eksploratora → teksty → eksport PNG 1× i 2× — obrazy ostre, bez uchwytów i napisów zastępczych.
- [ ] Pion: Ctrl+2, poprawki położenia, eksport „Obie” → dwa pliki.
- [ ] Zapis `.plakat`, zamknięcie, dwuklik na pliku `.plakat` (wersja z instalatora) otwiera projekt.
- [ ] Zamknięcie z niezapisanymi zmianami pyta o zapis.
- [ ] „Zakończ zadanie” w Menedżerze zadań w trakcie pracy → po ponownym starcie „Odzyskiwanie pracy” przywraca zmiany.
- [ ] Pokaz F5 na drugim ekranie (jeśli dostępny).
- [ ] Zdjęcie 6000×4000 px — import płynny, suwaki filtrów płynne.
- [ ] 30 minut pracy: brak spowolnień, pamięć w Menedżerze zadań stabilna.

- [ ] **Step 7: Commit**

```bash
git add scripts/make-icon.cjs build/icon.png package.json README.md
git commit -m "build: paczki .exe (portable i instalator), ikona i instrukcja użytkownika"
```

---

## Kolejność i zależności zadań

```
1 szkielet
├─ 2–10 rdzeń (czysta logika, TDD) — kolejno, każde zależy od poprzednich
├─ 11 DOM/okna/ustawienia
├─ 12 płótno → 13 zdjęcie/import → 14 punkty/QR/kształty → 15 interakcja → 16 polecenia/skróty
├─ 17 szkielet UI → 18 Wygląd → 19 Układ/Warstwy → 20 Element
├─ 21 biblioteki main (niezależne od 11–20, można robić równolegle po 11)
└─ 22 IPC i projekty → 23 autozapis → 24 eksport → 25 szablony → 26 pokaz → 27 E2E → 28 paczki
```
