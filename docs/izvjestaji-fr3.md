# Izvještaji po Corpus šablonima (FastReport .fr3)

Stanje: 26.11.2026. Kod: `lib/fastreport/`, prozori `src/report-window.tsx` i `src/report-designer.tsx`, meni *Kalkulacije → Izvještaji (Ispiši)…* i dugme *Ispiši…* u prozoru Utrošeni materijal.

## Šta radi

- **Šabloni:** svih 37 isporučenih `.fr3` (u `Template/fr3` lokalne biblioteke, manifest `templates`) se parsira, slaže i prikazuje bez grešaka na projektu Kuhinja_1. Stablo je po jeziku (Hrvatski, English, Ostalo) i kategoriji. Uvoz biblioteke (`scripts/import-local-corpus.ts`) sada kopira `Template/fr3`.
- **Motor** (`fr3-layout.ts`): trake Title, PageHeader/Footer, MasterData, DetailData, Header/Footer, GroupHeader/Footer, ReportSummary, podizvještaji (druge stranice šablona), filtri (`<DS."F">=...`), grupisanje po uslovu, paginacija, `[Page#]`, `[TOTALPAGES#]`, `[Line#]`, `[DATE]`, `[TIME]`, varijable šablona, `SUM`, `COUNT`, `IIF`, `Round`. Objekti: tekst (memo), RTF (kao običan tekst), linija, oblik, gradijent, slika (PNG/JPEG/BMP iz PropData). Objekti se sijeku na visinu trake kao u FastReportu.
- **Štampa:** HTML stranice u iframe-u (`window.print`), format stranice iz šablona.
- **Uređivač:** traka i objekti glavne stranice (i drugih stranica šablona): povlačenje, veličina, tekst i izrazi, font, veličina, podebljano/kurziv/podvučeno, poravnanje, boje, pozadina, okvir, dodavanje i brisanje teksta i linije, poništavanje. Spremanje kao novi šablon u `Template/fr3/user/` (server upisuje u `public` i `dist` i u manifest) ili preuzimanje `.fr3`. Originalni Corpus šabloni se nikad ne prepisuju. Serijalizacija je provjerena na svih 37 (parse → upis → parse bez gubitka).

## Skupovi podataka (`project-datasets.ts`)

Imena polja su uzeta iz izraza u šablonima. Gradi se: `PROJECTS`/`PROJECT`, `PARTS` (+ `ETI` kao isti redovi), `ELEMENT`, `PRJFIT`, `PRJEDGE`/`EDGE`, `ELMFIT`, `ELMEDGE`; `EXTRA`, `EQUIPMENT`, `ACCESSORIES` su prazni. Veze: `PARTS.ELEMENTID` i `ELMFIT/ELMEDGE.PARENTID` = `ELEMENT.ID` (redni broj korijenskog elementa).

**Pretpostavke koje nisu potvrđene u Corpusu:**
- `DTYPE` dijela: 0 ploča, 1 fronta, 2 pomoćni dio, 3 nepoznato. (Šablon Mihai_HC koristi `DTYPE=4`, a Popis fronti `DTYPE=1`.)
- `ACCESS` okova je 0 za sve. `PRICE` okova i traka je iz kataloga (`fittingPrices`, `Cijena` trake), a cijene ploča nisu u skupovima podataka.
- Šifra materijala je `SIFRA` iz kataloga, a smjer vlakana `GOD=-1` iz kataloga (`GRAIN` 1/0).
- Strane rubne trake: `STR0`/`STR1` duž širine, `STR2`/`STR3` duž visine, plus 80 mm po strani (potvrđeno na svih 6 redova Corpusa, vidi `lekcije/01-osnovna-edukacija-41-46-utroseni-materijal.md`). Redoslijed Duž D / Šir Do / Šir Go unutar para je pretpostavka.
- Podaci projekta: `KIME` iz `CREATOR` (NAZIV, PREZ), datum iz `INFO` (polje `dat`). Broj ponude, radni nalog i „Izradio" nisu pročitani (prazno).

**Ne postoji:** `OPTIPART`, `OPTPAGE`, `OPTP` (optimizacija; etikete i krojni planovi), `VRMAT`, `OPE_ALL` (cijene/usluge), pa ti dijelovi šablona ostaju prazni, a prozor to piše uz svaki takav šablon.

## Ograničenja

- Pascal skripte u šablonima (`OnBeforePrint` i dr., 31 od 37 šablona ih ima) se ne izvršavaju. Dvije posljedice su zamijenjene pravilima: detalj koji sadrži samo podizvještaje ispisuje se jednom po elementu, a detalj bez filtera vezuje se za trenutni `ELEMENT` kad skup ima `ELEMENTID`/`PARENTID`.
- Memo polja se ne rastežu prema tekstu (`Stretched`), barkodovi (QR/Code128) i RTF formatiranje se ne prikazuju.
- Prikaz u uređivaču je na nivou trake, bez pravila i vodilja; ne uređuju se varijable, skripte ni podaci.
