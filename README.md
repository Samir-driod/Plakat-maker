# Plakat Maker

Program do robienia plakatów na telewizory i monitory, w poziomie i w pionie. Wrzucasz zdjęcie, tytuł, kilka punktów i kod QR, a wygląd ustawiasz po swojemu. Działa bez internetu.

## Szybki start
1. Uruchom `PlakatMaker-1.0.0-portable.exe` (bez instalacji) albo zainstaluj `PlakatMaker-1.0.0-instalator.exe`.
2. Wybierz szablon startowy. Wszystko da się potem zmienić.
3. Przeciągnij swoje zdjęcie na plakat albo wklej je (Ctrl+V).
4. W zakładce Treść wpisz tytuł, punkty i adres dla kodu QR.
5. Eksportuj (Ctrl+E) do PNG, JPG lub PDF albo od razu pokaż plakat na ekranie (F5).

## Co potrafi
- Wersja pozioma i pionowa w jednym projekcie. Treść jest wspólna, a każda orientacja ma swój układ. Obie można wyeksportować naraz.
- 6 układów (zdjęcie z lewej lub prawej, w tle, karta, pół na pół, baner) i 10 motywów.
- Elementy przesuwa się myszką. Przyciągają się do środka, krawędzi i innych elementów. Można je obracać, zmieniać rozmiar, zaznaczać kilka naraz i wyrównywać.
- Zdjęcie może być prostokątem, zaokrąglonym prostokątem, kołem, łukiem albo sześciokątem. Ma ramkę, cień, kadrowanie myszą (dwuklik), filtry (czarno-białe, sepia, jasność, kontrast, nasycenie, rozmycie) i gotowe style.
- Kolory bierzesz z palety motywu, pipetą z ekranu, z ostatnio użytych albo prosto ze zdjęcia. Program ostrzega, gdy kontrast jest za słaby.
- 14 czcionek z polskimi znakami plus czcionki systemowe. Tekst sam dopasowuje rozmiar do ramki.
- Do 6 punktów ze znacznikiem do wyboru (kropka, ptaszek, numer, strzałka, gwiazdka, własny znak albo emoji). Hasło przed myślnikiem („Hasło - opis”) może mieć inny kolor i pogrubienie, a każdy punkt może wyglądać inaczej.
- Kod QR: link, tekst, Wi-Fi, e-mail, telefon albo wizytówka. Do tego styl modułów, kolory, logo w środku i podpis.
- Tło: kolor, gradient liniowy lub radialny, zdjęcie (z rozmyciem i przyciemnieniem) albo wzór.
- Dodatkowe teksty, obrazy (np. logo), kształty i linie. Warstwy można blokować i ukrywać.
- Eksport PNG, JPG i PDF w 1×, 2× (4K) i 3×. PDF w rozmiarze ekranu albo A4. Plakat można też skopiować do schowka.
- Pokaz pełnoekranowy na wybranym monitorze (F5).
- Własne szablony i lista ostatnich projektów. Autozapis co kilka sekund, odzyskiwanie po awarii i pytanie o zapis przy zamykaniu.

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
- CI uruchamia testy i build przy każdym pushu na `main` i w pull requestach. Niczego nie wydaje.
- Release uruchamia się tylko ręcznie: Actions, potem Release i Run workflow. Można podać wersję, np. `1.1.0`. Puste pole oznacza wersję z `package.json`. Workflow buduje oba pliki .exe i wystawia je jako wydanie `vX.Y.Z` w zakładce Releases.
