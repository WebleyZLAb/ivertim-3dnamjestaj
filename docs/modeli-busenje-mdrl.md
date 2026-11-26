# Bušenje dodijeljeno 3D modelima okova (`.mdrl`)

U Corpusu se bušenje okova ne računa iz makroa nego se **veže uz 3D model**: uz svaki model (`.wrl` ili `.dae`) u `CorpusSolutions/Modeli/<proizvođač>/` stoji `.mdrl` fajl s grupama bušenja. Korisnik uzme model (sajt proizvođača, prospekt), unese mjere, doda rupe koje trebaju i dodijeli bušenje modelu; makro (npr. Titus šarke kao skripta) radi isto za okove koji nemaju model.

## Obim (lokalna kopija CorpusSolutions)

- **9969** `.mdrl` fajlova: svi se čitaju bez greške (`lib/corpus-mdrl.ts`), **9034** grupe, **22262** bušenja (broj `SDrill` objekata u fajlovima je isti).
- Po proizvođaču (bušenja): Grass 4401, Blum 3375, New GRASS 3144, BLUM_V3.6.0 2690, Hettich_2023 2465, Hranipex_drawers 2158, HRANIPEX_handles 1148, GTV 971, DTC 748, Legrabox 351, GTV_AxisPro 344, HRANIPEX_hinges 185, Merivo_box 113, Blum_aventos 100, Aventos 58. `HAFELLE` ima 5 fajlova bez bušenja.
- Prečnici bušenja: Ø5 (13304), Ø3 (3868), Ø10 (1772), Ø8 (856), Ø4 (737), Ø35 (706, čašica šarke), Ø6 (554), Ø4,5, Ø6,5, Ø5,5, Ø26, Ø7. Dubine: 15, 2, 1, 10, 3, 13, 12, 14 mm najčešće.

## Format (Delphi tok objekata)

`C3DMD` → `c3dm` (tri XYZ, vjerovatno položaj i orijentacija modela) → `drll` / `DRLC` → `list` objekata `ODLO` → `drlo` grupe:

| Polje | Značenje |
|---|---|
| `nam` | naziv grupe (npr. `Plocica`, `Panti`, `Grasspantvijak`, `Front`, `List`) |
| `ddir` | smjer grupe (4 u 8760 grupa, 1 u 196, 0 u 76, 5 u 2); značenje nije potvrđeno |
| `rang` | opseg (float32); značenje nije potvrđeno |
| `pos` | ishodište grupe: tri float32 u metrima (`XYZ` ili `TXYZObject`) |
| `rlist` → `SDrill` | bušenja: `sru` = dva float32 (**prečnik, dubina** u mm), `xyz` = tri float32 (položaj u metrima), `kon`, `pro` = logičke zastavice (1124 bušenja imaju neku postavljenu) |

Jedinice položaja su metri (0,016 = 16 mm). `lib/corpus-mdrl.ts` (`readCorpusMdrl`) vraća milimetre.

## Primjeri (stvarni fajlovi)

- `Blum/173H7100.mdrl`: grupa `Plocica`, dvije rupe Ø5 × 1 na Y = ±16 (razmak pločice 32 mm). Test: `tests/corpus-mdrl.test.ts`.
- Blumove šarke `Blum/70M2550.TL.mdrl`: grupa `Panti`, čašica **Ø35 × 12** na (−6,5; 0; 38) i dvije rupe Ø8 × 10 (ili Ø5 × 1) na Y = ±22,5; `70T3550`: čašica Ø35 × **14**. To je isto bušenje (čašica 35 / 14) koje je makro `MAKRO HETTICH` računao za vrata iz projekta Ormari (`docs/mpr-radna-ploca-usjecanja.md`), samo što ga ovdje nosi model.

## Posljedica za Ivertim

- Bušenje okova može se **čitati iz modela**, a ne rekonstruisati iz makroa: za okov (šarka, nosač police, klizač, ručka) treba odrediti model, a rupe i dubine su već u `.mdrl`.
- Za nove okove korisnik ubacuje model, mjere i rupe, i dodjeljuje ih modelu; Ivertim treba isto (urednik grupa bušenja uz model, spremanje u biblioteku).
- **Nije urađeno:** povezivanje stavke kataloga (`Potrosni/*.cxm`, polje `DPKSEXTRA` s putanjom modela) s `.mdrl`, preslikavanje grupa bušenja na ploču u koju okov ulazi (smjer `ddir`, `pos`, osa fronte/boka), urednik bušenja uz model, ni izvoz tih rupa u `.mpr`.

## Veza kataloga okova → model → bušenje (`lib/corpus-fitting-model.ts`)

Stavka kataloga (`Potrosni/*.cxm`, `<PotItem Naziv oznakaP … DPKSEXTRA>`) u polju `DPKSEXTRA` nosi putanju modela (npr. `Blum\320H3500C15_L.wrl`), a bušenje je u `.mdrl` istog imena u `Modeli`. `parseFittingCatalog` vraća naziv, oznaku, UID (`OznId`) i putanju modela; `mdrlPathForModel` daje putanju `.mdrl`.

Pokrivenost lokalne kopije (20933 stavke u 24 kataloga): **18906** stavki ima model, za **9894** postoji `.mdrl`, **6868** ima bar jedno bušenje. Najvažniji katalozi (stavki / s modelom / s `.mdrl` / s bušenjem): Blum 2419 / 2419 / 1252 / 1229; BLUM_V3.6.0 5344 / 5307 / 1199 / 1177; HETTICH 5137 / 4837 / 4781 / 1988; GRASS 1140 / 1127 / 307 / 279; HRANIPEX_handles 1186 / 1159 / 797 / 763; Legrabox 700 / 700 / 102 / 94; GTV 186 / 186 / 184 / 181; DTC 412 / 411 / 321 / 317. Stavke bez `.mdrl` su modeli bez bušenja (npr. pribor `ZFZ…`).

Vlastiti katalozi (`IVERTIM_OKOV.cxm`: "BAGLAMA RAVNA BLUM" UID `{F2CDB877-…}`, "DRVENA TIPLA", "KONFIRMAT"; `TNT_OKOV`, `Potrosni1`, `User`) nemaju model: stavka je samo brojač okova, a bušenje dolazi iz makroa. U projektu Ormari tako rade šarke vrata (makro) i tiplovi (`Korpusiranje`).
