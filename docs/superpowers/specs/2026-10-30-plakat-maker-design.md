# Plakat Maker — specyfikacja projektu

Data: 2026-10-30 · Status: zatwierdzony kierunek (podejście A), rozszerzony o dodatkowe funkcje na prośbę użytkownika.

## 1. Cel

Prosty, stabilny program na Windows (.exe) do tworzenia plakatów wyświetlanych na ekranach (TV, monitor) w orientacji **poziomej i pionowej**. Typowy plakat: **zdjęcie użytkownika**, obok **tytuł**, **do 6 krótkich punktów** (domyślnie 4) i **kod QR**. Wszystko przeciągane myszką, z bogatą kastomizacją, eksportem do **PNG / JPG / PDF** i trybem pełnoekranowym.

Kryteria sukcesu:
- Od uruchomienia do gotowego PNG w < 2 minuty (wybór szablonu → zdjęcie → teksty → eksport).
- Podgląd = wynik: eksport piksel w piksel zgodny z tym, co widać na płótnie.
- Żadna awaria nie traci pracy (autozapis + odzyskiwanie).
- Działa w 100% offline.

## 2. Technologia

| Warstwa | Wybór | Wersja |
|---|---|---|
| Powłoka | Electron | 45.2.0 |
| Pakowanie | electron-builder (portable + instalator NSIS) | 26.18.0 |
| Płótno / drag & drop | Konva | 10.9.0 |
| QR | qrcode | 1.5.4 |
| PDF | jsPDF | 4.2.1 |
| Bundler renderera | esbuild | 0.28.2 |
| Testy jednostkowe | Vitest | 5.0.5 |
| Testy E2E | @playwright/test (tryb `_electron`) | 1.64.1 |
| Czcionki | @fontsource/* (offline, z polskimi znakami) | 5.3.0 |

Czysty JavaScript (ESM), bez frameworka UI. Proces główny ESM (`"type": "module"`), preload CommonJS (`preload.cjs`, wymagane przez sandbox).

## 3. Architektura

```
electron/           proces główny: okna, dialogi plików, IPC, autozapis, ustawienia, prezentacja
  lib/              czyste helpery Node (atomowy zapis, ostatnie pliki, ustawienia) — testowane
src/core/           czysta logika bez DOM — model, schemat, historia, układy, motywy, kolory,
                    przyciąganie, dopasowanie tekstu, QR, rozmiary eksportu — testowane Vitestem
src/canvas/         Konva: scena, renderowanie dokumentu, węzły elementów, zaznaczanie, eksport
src/ui/             DOM: pasek narzędzi, panele boczne, dialogi, skróty, upuszczanie plików
src/renderer/       punkt wejścia łączący store ↔ canvas ↔ ui
```

Przepływ danych: **jedno źródło prawdy** (`store`) → subskrybenci (`canvas/render`, `ui/bindings`). Każda zmiana idzie przez `store.update(recipe, opts)`, co daje cofanie/ponawianie, autozapis i flagę „niezapisane”.

### 3.1 Model dokumentu (wersja schematu 1)

- `orientation`: `'landscape' | 'portrait'`.
- `formats`: rozmiar projektu dla każdej orientacji (domyślnie 1920×1080 i 1080×1920).
- `palette`: `{ bg, bg2, accent, text, muted }` — elementy odwołują się do kolorów przez `'palette:accent'` albo podają `#rrggbb`. Zmiana motywu przekolorowuje wszystko.
- `fonts`: `{ heading, body }` — elementy wskazują `'heading' | 'body'` albo konkretną nazwę.
- `background`: `solid | linear | radial | image | pattern` + parametry.
- `elements`: treść i styl (wspólne dla obu orientacji), każdy ma `role` (`photo`, `title`, `subtitle`, `points`, `qr`, `accent`, `panel`, `footer`, `free`).
- `boxes.landscape` / `boxes.portrait`: geometria `{ x, y, w, h, rotation, hidden }` osobno dla każdej orientacji.
- `order`: kolejność warstw (wspólna).
- Zasoby (zdjęcia jako data URL) trzymane **poza** historią cofania (`assets`), zapisywane razem z projektem.

### 3.2 Elementy

| Typ | Najważniejsze opcje |
|---|---|
| `photo` | kształt (prostokąt, zaokrąglony, koło, łuk, sześciokąt), ramka (grubość, kolor), cień, kadrowanie (zoom, przesunięcie), odbicie lustrzane, filtry (czarno-białe, sepia, jasność, kontrast, nasycenie, rozmycie) |
| `text` | treść, czcionka, rozmiar, pogrubienie, kursywa, WIELKIE LITERY, odstęp liter, interlinia, wyrównanie, kolor, cień, obrys, automatyczne dopasowanie do ramki |
| `points` | 1–6 punktów, znacznik (kropka, ptaszek, numer, strzałka, myślnik, gwiazdka, własny znak/emoji), kolor znacznika, rozmieszczenie (od góry / równomiernie), automatyczne dopasowanie |
| `qr` | typ treści (link, tekst, Wi-Fi, e-mail, telefon, wizytówka vCard), kolory, styl modułów (kwadraty, zaokrąglone, kropki), poziom korekcji, logo w środku, podpis, karta z tłem |
| `image` | dodatkowe obrazy (logo), przezroczystość, zaokrąglenie |
| `shape` | prostokąt, elipsa, linia; wypełnienie, obrys, zaokrąglenie, przezroczystość |

### 3.3 Edytor

- Przeciąganie, zmiana rozmiaru i obrót (Konva Transformer), zaznaczanie wielu elementów (Shift + klik, ramka zaznaczenia).
- Przyciąganie do krawędzi i środka płótna, marginesów bezpiecznych i innych elementów, z liniami pomocniczymi; siatka; obszar bezpieczny TV (5%).
- Klawiatura: strzałki (1 px, z Shift 10 px), Delete, Ctrl+D, Ctrl+Z / Ctrl+Y, Ctrl+] / Ctrl+[ (warstwy), Esc.
- Zoom: dopasuj, 100%, Ctrl + kółko.
- Tryb kadrowania zdjęcia (dwuklik): przeciąganie przesuwa kadr, kółko zmienia zoom, Enter/Esc kończy.
- Blokowanie i ukrywanie elementów (ukrycie osobno dla każdej orientacji), lista warstw.
- Przeciąganie plików do okna: obraz → do zdjęcia (lub jako nowy obraz z Alt), `.plakat` → otwarcie projektu. Wklejanie obrazu ze schowka (Ctrl+V).

### 3.4 Kastomizacja

- 10 gotowych motywów (paleta + czcionki + tło + znacznik punktów + kształt zdjęcia + styl QR).
- Edytor palety: próbniki kolorów, pipeta z ekranu (EyeDropper API), **„Kolory ze zdjęcia”** (automatyczna paleta wyliczona ze zdjęcia), ostatnio użyte kolory, ostrzeżenie o słabym kontraście tekstu (WCAG < 4.5).
- 14 wbudowanych czcionek (Inter, Montserrat, Poppins, Roboto, Open Sans, Lato, Nunito, Raleway, Oswald, Bebas Neue, Playfair Display, Merriweather, Lora, Caveat) + czcionki systemowe Windows (Arial, Segoe UI, Calibri, Georgia, Verdana, Impact).
- Tło: jednolite, gradient liniowy (kąt), radialny, zdjęcie (rozmycie, przyciemnienie), wzór (kropki, kratka, ukośne linie, fale).
- 6 układów: zdjęcie z lewej / u góry, zdjęcie z prawej / u dołu, zdjęcie w tle z panelem, karta centralna, pół na pół (zdjęcie na spad), baner ze zdjęciem — każdy liczony osobno dla poziomu i pionu. Układ ustala też, co leży na spodzie (w karcie: panel pod zdjęciem; w pozostałych: zdjęcie pod panelem).
- Formaty: 16:9, 9:16, 4:3, 3:4, 1:1, 21:9 i własny rozmiar.

### 3.5 Pliki i stabilność

- Projekt `.plakat` (JSON z wersją schematu i osadzonymi zasobami); zapis atomowy (plik tymczasowy → zmiana nazwy) z kopią `.bak`.
- Walidacja i normalizacja przy wczytywaniu (brakujące pola uzupełniane domyślnymi, uszkodzone elementy pomijane z ostrzeżeniem), migracje wersji schematu.
- Autozapis co 3 s po zmianie do `userData`, odzyskiwanie po awarii przy starcie.
- Pytanie „Zapisać zmiany?” przy zamykaniu, tytuł okna z gwiazdką, lista ostatnich plików.
- Duże zdjęcia zmniejszane przy imporcie do 3000 px (dłuższy bok).
- Globalna obsługa błędów: komunikat dla użytkownika + log w `userData/logs/error.log`; awaria renderera → przeładowanie i odzyskanie z autozapisu.
- Jedna instancja programu (drugie uruchomienie z plikiem otwiera go w istniejącym oknie).
- Bezpieczeństwo: `contextIsolation`, `sandbox`, brak `nodeIntegration`, CSP.

### 3.6 Eksport i ekran

- PNG, JPG (jakość), PDF (rozmiar ekranowy lub A4 z dopasowaniem); skala 1×, 2× (4K), 3×.
- „Eksportuj oba warianty” (poziom + pion naraz), kopiowanie do schowka, „Pokaż w folderze”.
- Tryb prezentacji (F5): pełny ekran na wybranym monitorze, Esc zamyka.
- Własne szablony: „Zapisz jako szablon”, galeria szablonów z miniaturami w oknie „Nowy projekt” (8 starterów motyw + układ). To samo okno pojawia się przy starcie jako ekran powitalny (można wyłączyć).
- Pasek narzędzi mieści się od 1100 px szerokości: menu „Plik ▾” i „+ Dodaj ▾”, przycisk Zapisz, cofnij/ponów, orientacja, zoom, pomoc, Pokaz, Eksportuj.
- Napisy zastępcze („Kliknij dwukrotnie…”, „Uzupełnij dane kodu QR”) nie trafiają do eksportu; okno eksportu ostrzega przed brakującym zdjęciem, niekompletnym QR i przykładowym tytułem.

## 4. Poza zakresem (YAGNI)

Usuwanie tła zdjęcia, animacje, wiele stron/slajdów, chmura, wersja online, wielojęzyczny interfejs (tylko polski), drukarki (PDF wystarczy).

## 5. Testowanie

- Vitest: cała `src/core` i `electron/lib` (czysta logika, TDD).
- Playwright `_electron`: test dymny E2E — start, zmiana tytułu, przełączenie orientacji, eksport PNG do katalogu testowego (zmienna `PLAKAT_E2E_DIR` omija okna dialogowe), zapis i ponowne wczytanie projektu.
- Ręczne listy kontrolne w zadaniach dotyczących płótna i UI.
