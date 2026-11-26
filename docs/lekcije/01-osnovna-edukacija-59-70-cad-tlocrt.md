# Osnovna edukacija 1/7, koraci 59–70: CAD alati u tlocrtu

Izvor: tekst i slike lekcije (`corpus-baza/edukacije/01-osnovna-edukacija-17.md`, slike 059–070). Snimak ekrana nije bilo; ovo je prvi korak, izgrađen iz opisa lekcije i provjeren na Kuhinji_1 u pregledniku.

## Šta lekcija opisuje

1. *Perspektiva* → **Odozgora** (tlocrt) daje pristup CAD alatima.
2. Izbornik alata: **Dodaj polyline / Dodaj liniju / Dodaj četverokut / Dodaj kružnicu**.
3. Polilinija: klikovi dodaju točke, **pravi ugao** se uključuje ikonom, desni klik → **završi trenutnu radnju**.
4. Kotiranje linija.
5. **Zid na liniji:** označi liniju, odredi gdje se zid pozicionira, u biblioteci otvori **Wall installations → Wall** i učitaj element; zid se vidi u perspektivi i može se pomicati po prostoriji.

## Šta je u našem programu

*Tehnički nacrt → Gornji* ima traku **CAD** (`src/plan-cad-ui.tsx`, geometrija u `lib/plan-cad.ts`):
- alati Polilinija, Linija, Četverokut, Kružnica; Esc prekida; desni ili dupli klik završava polilinije;
- **Pravi ugao** (vodoravno/okomito od prethodne točke) i **mreža 50 mm**;
- dužina svakog segmenta ispisana na crtežu (kružnica: radijus); klik na liniju je bira, Obriši liniju / Obriši sve;
- **Dodaj zid na liniju:** za svaki segment izabrane linije umeće se `Elmsav/Wall_installations/Wall.e3d` s dužinom segmenta (širina elementa uz preračun parametara), debljinom koju zadaš (zadano 100 mm) i uglom segmenta; zid leži po sredini linije, lijevo ili desno od nje. Dodavanje je jedan korak za poništavanje (Ctrl+Z).

Provjera: test `tests/plan-cad.test.ts` potvrđuje da zid pada tačno na liniju za više smjerova (preko iste projekcije koju koristi tlocrt) i da prava `Wall.e3d` iz biblioteke dobije dužinu, debljinu 120 mm i ugao −90°; u pregledniku je L-polilinija 2450 + 600 mm dala dva zida X 1300–3750 i Z −350–250 sa debljinom 100 mm.

## Nepotvrđeno i nedostaje

- **Linije se ne upisuju u S3D.** Naše linije se pamte u pregledniku po nazivu projekta (vraćaju se pri ponovnom otvaranju) i mogu se spremiti u fajl `<projekt>.ivertim-cad.json` (*Spremi linije*) i učitati (*Učitaj linije*, uz provjeru da pripadaju istom projektu). Zidovi su obični elementi projekta i čuvaju se kao i ostali elementi.
- **Gdje Corpus čuva CAD oblike (dekodirano 26.11.2026.):** u toku `PLANES` (heksadecimalni Delphi tok) na kraju S3D-a. Ravnina je `TBP` sa `dir`, `up`, postavkama pogleda (`TsetupPogleda`, šablon dokumentacije `Template\Doc\Frontw.ods`), listom oblika (`shpl`, `TSHCOL`) i listom kota (`kotl`, `TKotaList`). Oblici su `TShape*` klase s tačkama `TShapePathPoint` (`pkind`, `pos` = tri single vrijednosti). Provjereno na 9 projekata: ravnina 0 (dir 0,0,1) je tlocrt s kvadratom (±2515, ±2500) = obris poda 5030 × 5000 mm (centrirano na sredinu sobe), a ravnine 1–4 su elevacije zidova s kvadratima (širina × 2745 visine). Čitač je u `lib/corpus-planes.ts` (samo čitanje, testiran).
- **Nije povezano s prikazom:** nijedan dostupan projekat nema ručno nacrtanu liniju ni zid, pa nisu poznate klase oblika za polilinije i zidove, a ni orijentacija ose Z prema koordinatama elemenata. Kad se dobije jedan S3D sa linijom nacrtanom u Corpusu (dovoljno je „jedna polilinija i jedan zid"), čitač se može povezati s tlocrtom, a poslije i pisanje u S3D.
- Kotiranje je samo dužina segmenta; nema ručnih kota, vezivanja za točke, presjeka ni offseta (spominju se u snimku iz 24.10.).
- Izbor strane zida u Corpusu („odredi gdje će se zid pozicionirati") nije snimljen; ovdje je izbor sredina/lijevo/desno.
- Vezanje na postojeće elemente i uglove (snap na ivice) nije urađeno.
- Treba snimak koraka 59–70 da se poravna tok klikova s Corpusom.
