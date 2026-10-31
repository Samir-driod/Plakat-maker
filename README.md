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

### GitHub Actions
- **CI** — testy i build przy każdym pushu na `main` i w pull requestach (bez wydania).
- **Release** — tylko ręcznie: zakładka *Actions* → *Release* → *Run workflow*. Można podać wersję (np. `1.1.0`; puste = wersja z `package.json`). Workflow buduje oba pliki .exe i publikuje je jako wydanie `vX.Y.Z` w zakładce *Releases*.
