# MPR programi radne ploče: ručna usjecanja

Izvor: `.mpr` (WoodWOP) programi iz Corpus izvoza na Y: disku (2359 programa, 6 radnih ploča `PartName: Radna_Ploha*`). Radne ploče nemaju bušenja (`<102`/`<103`), nego samo konturno glodanje `<105 \Konturfraesen\` (ručno dodana usjecanja za sudoperu i ploču za kuhanje) iznad kojih stoji kontura `]N` kao niz tačaka `$E0 KP`, `$En KL` (`X`, `Y`, `Z`).

Zaglavlje: `l` = dužina ploče, `b` = dubina, `d` = debljina; `PartName`, materijal i trake su u `<101 \Comment\` (`KM="PartName: ..."`). `X` ide duž dužine, `Y` duž dubine ploče (600).

| Program | Ploča (l × b) | Kontura (širina × visina, početak X, Y) | Tačaka |
|---|---|---|---|
| DALIBOR/100000010 | 1002 × 600 | 494 × 494 na (468, 53) | 41 (zaobljeni uglovi) |
| KOMPLET STAN 2/100000449 | 1360 × 600 | 560 × 490 na (612, 55) | 5 (pravougaonik) |
| KOMPLET STAN 2/100000450 | 1060 × 600 | 490 × 490 na (50, 55) | 41 (zaobljeni uglovi) |
| KUHINJA SWISSLIFE SION/100000130 | 2423 × 600 | 560 × 490 na (41, 55) i 775,7 × 478,4 na (1253, 60,3) | 5 i 45 |
| MARK NISIC KUHINJA axicon/100000033 | 1920 × 600 | 530 × 430 na (755, 85) | 5 |

Zaključci:
- Usjecanje je zatvorena kontura (prva i zadnja tačka ista); pravougaonik ima 5 tačaka, zaobljeni oblik se aproksimira sa mnogo kratkih segmenata (`KL`) bez lukova.
- Ista radna ploča može imati više usjecanja (SWISSLIFE: ploča za kuhanje i sudopera).
- Ivertim ova usjecanja još ne modelira; ona su jedina ručno dodana "obrada" na radnim pločama u uzorku. Otvoreno: crtanje/uvoz usjecanja u radnu plohu i izvoz u `.mpr`.

## Usjecanje u S3D (čitač `lib/corpus-cutouts.ts`)

U S3D ploči usjecanje je sekundarna zatvorena kriva (`CURVE=0…`, `CNNAME=Line`) u `<KRIVULJE DATA>`, uz `MILLDATA=` (podaci o alatu); konturu ploče čini `CURVE=-1` (Outline). Tačke `PTX`/`PTZ` su u metrima. Uzorak MARK NISIC (ploča 1920 × 600): `PTX` 0,635 i 1,165, `PTZ` 0,085 i 0,515, što je 530 × 430 na (635, 85); u `.mpr` je X = dužina − PTX (755…1285), Y = PTZ. Tačke imaju i formule (`PTFFX="b-755-530"`, `PTFFY="85+430"`).

`corpusBoardCutouts(board)` vraća krive s `MILLDATA` (zatvorene, ≥ 3 tačke). Provjereno na uzorku (MARK NISIC: 1 usjecanje 530 × 430 @ 635, 85). Ista oznaka glodanja se koristi i za utore u leđima (npr. 1460 × 40), pa čitač vraća svaku glodanu konturu, ne samo sudoperu i ploču za kuhanje. U Kuhinja.S3D neke koordinate su negativne (npr. −280, −245), pa je ishodište tih krivih drugačije; to nije razjašnjeno.

## Dodavanje usjecanja (Umetanje → Usjecanje radne ploče…)

- `appendCorpusRectCutout(data, rect)` dodaje "Line" krivu s uglovima i `MILLDATA` iz uzorka; `addCorpusE3dBoardCutout(xml, boardIndex, rect, path)` to upisuje u `KRIVULJE DATA` ploče E3D izvora, a ostalo ostaje netaknuto.
- Dijalog `src/cutout-dialog.tsx` (isti put kao Gola: element iz biblioteke ili umetnut, npr. Radna ploha, jer se mijenja njegov E3D izvor): izbor ploče, mjere od lijeve i zadnje ivice, širina i dubina, pregled (postojeće glodane konture sive, nova crvena), provjera da usjecanje ne izlazi iz ploče.
- Ploče koje je napravio Ivertim nemaju oznaku krive; kontura dobija `CURVE=-1` (Outline), a usjecanje sljedeći broj.
- Zaobljeni uglovi: polje "Radijus uglova" (luk PTSTYLE=2 s PTARRA, isto kao Gola kontura).
- Neprovjereno: da Corpus otvara ovako dopisan fajl (Corpus se ne može pokrenuti odavde). Nema formula `PTFFX`/`PTFFY` ni izvoza u `.mpr`. Brisanje: dugme "Obriši" uz svako glodano usjecanje u dijalogu (`removeCorpusE3dBoardCutout`).

## Izvoz u .mpr (Export → "MPR usjecanja radne ploče…")

`lib/mpr-export.ts` (`corpusBoardCutoutMpr`) piše WoodWOP program s `<105 \Konturfraesen\` za svako usjecanje izabranog elementa, jedan fajl po ploči. Format po Corpusovom programu: CRLF, `X = dužina − PTX`, `Y = PTZ`, redoslijed tačaka p0 pa unazad, luk razvijen u kratke ravne segmente (`KL`), alat `T6`.

Provjera na pravim podacima (Y: disk): za MARK NISIC (ploča 1920 × 600) izlaz je **bajt po bajt isti** kao Corpusov `100000033.mpr`. Za SINIŠA BULIĆ kuhinju koordinate oba usjecanja (560 × 490 i 545 × 470) se poklapaju s `100000313.mpr`; ta ploča ima centrirane krive, pa čitač usjecanja sada primjenjuje pomak iz binarnog `CURVEDATA` (`pos`: Z, X u metrima).

Razlike: komentari o rubnim trakama (`Left:/Right:/Back: Tip:...`) se ne pišu; alat je zadano `T6` (u S3D `MILLDATA` je `T100`, a Corpus u programu piše `T6`, razlog nije potvrđen); `.mpr` se sprema kao UTF-8 s ASCII imenima, ne kao windows-1250. Nije probano u mašini ni u WoodWOP-u.
