# Corpus makro runtime kontekst

Ova nota odvaja ono što je potvrđeno artefaktima od onoga što još ne treba
automatski računati. Eksterni Corpus folderi služe samo kao read-only dokaz.

## Potvrđeno

- Element daje globalne `SIRINA`, `VISINA` i `DUBINA` vrijednosti.
- Ploča daje položaj, mjere, `SMJER` i debljinu `GR`.
- `OBJn.MINX/MAXX/MINY/MAXY` opisuju lokalne granice ploče. Za ploču sa
  konturom uzimaju se stvarne X/Z granice konture; za običan pravougaonik
  koriste se `0..VISINA` i `0..DUBINA`.
- `PMINX/PMINY/PMAXX/PMAXY` nisu iste vrijednosti: makroi ih koriste kao
  granice aktivnog presjeka/spoja između dva objekta.
- `AUTOST` ima šest vrijednosti (`0..5`) i zavisi od strane spoja, ne samo od
  `SMJER` orijentacije ploče.

Primarni uzorak: `CorpusSolutions/Elmsav/_ZIDOVI - PROZORI I VRATA ZA TNT/Okno_jedno_skrzydło0.e3d`.
Njegove formule odvojeno kopiraju `obj1.minx/maxx/miny/maxy`,
`obj2.minx/maxx/miny/maxy`, `pminx/pmaxx/pminy/pmaxy`, `xdelta/ydelta` i oba
`obj*.autost`. Operacije zatim koriste `PMIN/PMAX` i `AUTOST` za položaj i
stranu bušenja.

## Trenutno ponašanje IVERTIM Corpusa

- Potvrđene vrijednosti ploče računaju se automatski i vidljive su u panelu
  **Automatski kontekst**.
- Vrijednosti spoja i `AUTOST` korisnik može zadati ručno u naprednom panelu.
- Prazna vrijednost ostaje neriješena; simulator je ne pretpostavlja.
- Za dvije izabrane nerotirane pravougaone ploče prikazuje se 3D dijagnostika:
  površinski dodir, razmak, preklapanje ili dodir samo ivicom/tačkom. Prikazani
  `AUTOST` 2–5 je kandidat izveden iz formule strane; 0/1 se još ne nagađa.
- Svjetski pravougaonik dodira preslikava se u lokalne X/Y koordinate obje
  ploče. Lokalna X/Y osa zavisi od strane: velika ploha koristi
  `visina/dubina`, ivica visine `debljina/dubina`, a ivica dubine
  `debljina/visina`. Te vrijednosti su geometrijski presjek, ne još potvrđena
  Corpus `PMIN/PMAX` semantika.

## Sljedeći dokazni korak

Uporediti lokalne presjeke sa postojećim rupama i formulama kroz više
različitih `SMJER` parova. Tek nakon te provjere rezultat smije automatski
popunjavati `PMIN/PMAX`, `DELTA/DELLTA` ili `AUTOST`.

## Audit stvarnih lokalnih podataka

Read-only audit `audit:joints` nad kopijama podataka dao je ovaj ograničeni
presjek:

- `Elmsav`: 2671/2671 E3D fajlova parsirano, 4807 veza, 834 konkretna para;
  813 parova pripada makrou `NOGICA_PVC_100_150` i uključuje pomoćnu plošnu
  geometriju debljine 0, a 21 kontakt je uglavnom dekorativna geometrija
  uređaja.
- `sobasav`: 30/30 S3D fajlova parsirano, 2390 veza, 612 konkretnih parova;
  608 je isti makro nogice sa debljinom 0, a četiri kontakta pripadaju
  dekorativnoj geometriji frižidera.
- Nije pronađena nijedna nevažeća referenca objekta niti greška parsiranja.

Zaključak audita je negativan, ali ograničen: ovi konkretni parovi ne mogu
potvrditi opštu `PMIN/PMAX` semantiku proizvodnih spojeva. Dinamičke veze sa
`OB2=-1` zahtijevaju Corpusov izbor susjeda ili dodatni sačuvani projekat u
kojem je veza razriješena. Zbog toga geometrijski presjek ostaje vidljiva
dijagnostika i još se ne ubrizgava u simulator kao Corpus runtime činjenica.
