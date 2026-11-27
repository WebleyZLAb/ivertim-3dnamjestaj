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
- Ivertim ova usjecanja još ne modelira; ona su jedina ručno dodana "obrada" na radnim pločama u uzorku. Otvoreno: crtanje/uvoz usjecanja u radnu ploču i izvoz u `.mpr`.

## Usjecanje u S3D (čitač `lib/corpus-cutouts.ts`)

U S3D ploči usjecanje je sekundarna zatvorena kriva (`CURVE=0…`, `CNNAME=Line`) u `<KRIVULJE DATA>`, uz `MILLDATA=` (podaci o alatu); konturu ploče čini `CURVE=-1` (Outline). Tačke `PTX`/`PTZ` su u metrima. Uzorak MARK NISIC (ploča 1920 × 600): `PTX` 0,635 i 1,165, `PTZ` 0,085 i 0,515, što je 530 × 430 na (635, 85); u `.mpr` je X = dužina − PTX (755…1285), Y = PTZ. Tačke imaju i formule (`PTFFX="b-755-530"`, `PTFFY="85+430"`).

`corpusBoardCutouts(board)` vraća krive s `MILLDATA` (zatvorene, ≥ 3 tačke). Provjereno na uzorku (MARK NISIC: 1 usjecanje 530 × 430 @ 635, 85). Ista oznaka glodanja se koristi i za utore u leđima (npr. 1460 × 40), pa čitač vraća svaku glodanu konturu, ne samo sudoperu i ploču za kuhanje. U Kuhinja.S3D neke koordinate su negativne (npr. −280, −245), pa je ishodište tih krivih drugačije; to nije razjašnjeno.

## Dodavanje usjecanja (Editor elemenata → kartica Bušenje)

- `appendCorpusRectCutout(data, rect)` dodaje "Line" krivu s uglovima i `MILLDATA` iz uzorka; `addCorpusE3dBoardCutout(xml, boardIndex, rect, path)` to upisuje u `KRIVULJE DATA` ploče E3D izvora, a ostalo ostaje netaknuto.
- Panel `src/cutout-panel.tsx` u kartici Bušenje editora elemenata, za aktivnu ploču (meni Umetanje ostaje za elemente: radna ploča, grijaći elementi i slično; isti put kao Gola: element iz biblioteke ili umetnut, npr. Radna ploča, jer se mijenja njegov E3D izvor): mjere od lijeve i zadnje ivice, širina i dubina, pregled (postojeće glodane konture sive, nova crvena), provjera da usjecanje ne izlazi iz ploče.
- Ploče koje je napravio Ivertim nemaju oznaku krive; kontura dobija `CURVE=-1` (Outline), a usjecanje sljedeći broj.
- Zaobljeni uglovi: polje "Radijus uglova" (luk PTSTYLE=2 s PTARRA, isto kao Gola kontura).
- Neprovjereno: da Corpus otvara ovako dopisan fajl (Corpus se ne može pokrenuti odavde). Nema formula `PTFFX`/`PTFFY`. Brisanje: dugme "Obriši" uz svako glodano usjecanje u panelu (`removeCorpusE3dBoardCutout`).

## Izvoz u .mpr (Export → "MPR usjecanja radne ploče…")

`lib/mpr-export.ts` (`corpusBoardCutoutMpr`) piše WoodWOP program s `<105 \Konturfraesen\` za svako usjecanje izabranog elementa, jedan fajl po ploči. Format po Corpusovom programu: CRLF, `X = dužina − PTX`, `Y = PTZ`, redoslijed tačaka p0 pa unazad, luk razvijen u kratke ravne segmente (`KL`), alat `T6`.

Provjera na pravim podacima (Y: disk): za MARK NISIC (ploča 1920 × 600) izlaz je **bajt po bajt isti** kao Corpusov `100000033.mpr`. Za SINIŠA BULIĆ kuhinju koordinate oba usjecanja (560 × 490 i 545 × 470) se poklapaju s `100000313.mpr`; ta ploča ima centrirane krive, pa čitač usjecanja sada primjenjuje pomak iz binarnog `CURVEDATA` (`pos`: Z, X u metrima).

Razlike: komentari o rubnim trakama (`Left:/Right:/Back: Tip:...`) se ne pišu; alat je zadano `T6` (u S3D `MILLDATA` je `T100`, a Corpus u programu piše `T6`, razlog nije potvrđen); `.mpr` se sprema kao UTF-8 s ASCII imenima, ne kao windows-1250. Nije probano u mašini ni u WoodWOP-u.

## Bušenja u `.mpr` nisu u S3D-u

Provjera na projektu Siniša Buić - Ormari: 66 ploča ima broj programa, a **nijedna nema zapis rupa (`RUPE`) u S3D-u**, iako njihovi `.mpr` programi imaju do 43 vertikalna (`<102`) i 5 horizontalnih (`<103`) bušenja (Lijevi_bok/Desni_Bok, različite koordinate za lijevu i desnu stranu). Dakle bušenja nastaju pri izvozu iz Corpusovih pravila (spojnice, nosači polica, okovi), a ne iz podataka ploče. Zato se `.mpr` s bušenjima ne može napraviti iz S3D-a bez rekonstrukcije tih pravila. To je glavni preostali korak do programa koji zamjenjuje Corpus za mašinu; počinje se od `<102`/`<103` parametara (`XA`, `YA`, `TI` dubina, `DU` prečnik, `AB` razmak, `BM`) i poređenja lijeve i desne strane iz uzorka.

## Utori i ose u programu (provjereno na stvarnim parovima S3D + `.mpr`)

- **Utori:** rupe s `RAS MODE=4` (7 u uzorku) su glodani džepovi, u programu `<112 \Tasche\`: `XA`/`YA` = izračunati izrazi `x`/`y`, `WI = −ANG`, `LA = SIR`, `BR = VIS`, `XY = XYOV`, `RD = CRAD`, `TI` = dubina, `F_ = FEED`, alat `MILTOOL 100` → `T6`. Uzorak MILUNOVIC STAN 2, Ledja 1850 × 330 (dva utora) i Ledja 2310 × 310 (jedan): izlaz je isti kao Corpusov program, bez komentara o rubnim trakama. `MODE=1` (756 rupa, obična bušenja) i `MODE=3` (2 rupe, linijsko glodanje) u tim projektima nemaju uparen program pa nisu rekonstruisani.
- **Ose:** u programu je `l` uvijek veća, a `b` manja mjera ploče (947 ploča, bez obzira na smjer). Kad je VISINA manja od DUBINE: X = Z, Y = X iz S3D-a; inače X = VISINA − X, Y = Z. Koordinate utora (`XA=x`, `YA=y`) provjerene su samo na zamijenjenim pločama (Ledja).
- **Materijal:** u programu piše šifra materijala iz kataloga (`U115_ST9`), ne puni naziv.
- **Rubne trake:** zaglavlje `\Left:1.0;Right:1.0;Front:1.0;Back:1.0;\` i komentari `Left/Right/Front/Back: Tip:1mm Mat:...` se ne pišu. Strana traka u programu ne slijedi jednoznačno strane iz S3D-a (ista kombinacija daje Front, Left ili Right zavisno od ploče), a debljina dolazi iz kataloga traka.

## Proizvodna strana

Programi iz `lib/mpr-export.ts` čitaju se postojećim čitačem Tiplarice (`ivertim-optimizator/ui/src/daske/mpr.ts`, `parseMpr`): za Ledja 1850 × 330 daje iste mjere, naziv, materijal i konturu kao Corpusov program; razlikuje se samo `edges` (komentari o rubnim trakama se ne pišu). Taj čitač ne čita `<112 \Tasche\` (utore) ni u Corpusovom programu. Šabloni mašine (`Y:\Tiplarica sabloni XML`, format `KDTPanelFormat`: `Rect` džep s alatom i radijusom, `Vertical Hole` s izrazima poput `L-(100)`) su zasebna ruta do mašine; ovdje nisu povezani.

## Rubne trake u programu: što je utvrđeno

Na 951 ploči s uparenim programom S3D i program imaju isti broj okantiranih strana (947). Kad je okantirana samo jedna strana, ime strane u programu slijedi osu ploče: bez zamjene osa (VISINA ≥ DUBINA) strana 2 je `Front`, strana 3 je `Back`; sa zamijenjenim osama (VISINA < DUBINA) strana 0 je `Front`, strana 1 je `Back`. Strane `Left`/`Right` (kratke ivice) nisu jednoznačne: ista strana daje `Left` u 28 slučajeva i `Right` u 8, pa pravilo nije izvedeno. Debljina u zaglavlju (`1.0`, `0.5`, `0.0` za ABS) i `Tip:` dolaze iz kataloga traka. Zato se zaglavlje i komentari o trakama ne pišu.

## Linijski utori (`RAS MODE=3` → `<109 \Nut\`): hipoteza, nije implementirano

U S3D-u (Kuhinja.S3D, Lijevi_bok/Desni_Bok 1190 × 320 × 18) rupa `MODE=3` ima `STX="L-120"`, `STY="0"`, `ENX="L-120"`, `ENY="B"`, `SIR="4"`, `DUB="11"`, dubinu rupe 15; te ploče nemaju program. U Corpusovim programima postoji 189 blokova `<109 \Nut\` (BOJAN JEFTIC/100000124: ploča 2430 × 452 × 18, `XA=53.5 YA=452 XE=2326.5 YE=452 RK="WRKR" EM="MOD0" T_="200" TI="15" XY="1" KO="00" NB="4" EN="1"`) i `NB="4"` je u svih 189. Vjerovatno je `STX/STY` → `XA/YA`, `ENX/ENY` → `XE/YE`, `SIR` → `NB`, dubina → `TI`, a `L` i `B` su duža i kraća mjera ploče. Nijedan od tih programa nema uparen S3D, pa pravilo (naročito smjer osa na pločama gdje je VISINA < DUBINA i značenje `DUB=11`) nije provjereno; zato nije ugrađeno u izvoz.

## Bušenja dolaze iz makroa (provjera na Siniša Buić - Ormari, S3D + 66 programa)

U S3D-u su ploče bez rupa (`RUPE`), ali 26 od 34 elementa ima makro veze (`Korpusiranje` 43×, `PERFORACIJE_5_RUPA` 12×, `MAKRO HETTICH` 11×, `NOGICA_PVC_100_150` 8×). Makro se čuva kao deflate+base64 u sekcijama `MSVA` (varijable), `MSJO` (spoj), `MSRA` (redovi rupa), `MSPO` (ostalo). `PERFORACIJE_5_RUPA` (element `ormar_2dijela`, `object1` = Polica3, `object2 = −1` = susjed koji Corpus bira):

- `MSVA`: `BROJ_RUPA=3, PRECNIK_RUPE=5, POZICIJA_RUPA_NAPRED=50, POZICIJA_RUPA_POZADI=50, RAZMAK_IZMEDJU_RUPA=32`
- `MSRA` (dva reda): `GB=Broj_rupa, GD=9 (dubina), GF=5 (prečnik), GX=(Broj_rupa/2−0.5)*RAZMAK−Precnik/2, GY=Pozicija_rupa_napred` odnosno `GY=pmaxy−Pozicija_rupa_pozadi`, `GS=obj2.autost` (strana), `GR=32`.

U programima bočnih stranica istog elementa (`100000051` Lijevi_bok, `100000052` Desni_Bok, 1850 × 500 × 18) nalaze se upravo ti rezultati: grupe od tri vertikalne rupe Ø5, dubine 9, razmaka 32 mm (npr. XA 1222.5 / 1254.5 / 1286.5), na `YA=70` i `YA=450` (b − 50 = 450, a prednji red 50 + 20 = 70, pa je `pminy` 20). Pored toga ima Ø8/Ø7 rupa (spojnice korpusa iz makroa `Korpusiranje`) i horizontalnih rupa. Lijevi i desni bok imaju različite pozicije grupa. Dakle `.mpr` se ne može napraviti bez izvršavanja makroa; `docs/macro-runtime-context.md` navodi da `PMIN/PMAX` i `AUTOST` nisu provjereni, a ovaj par (makro + stvarni program) je prvi uzorak za tu provjeru.

### Prvo izvršavanje makroa: `PERFORACIJE_5_RUPA` na stvarnom elementu

Element `ormar_2dijela` (Siniša Buić - Ormari): bokovi `Lijevi_bok` (poz. X 0, Y 118, visina 1850, dubina 500) i `Desni_Bok` (X 798), police Polica7…Polica10 i Polica3 (debljina 18, Z −20, dakle prednja ivica uvučena 20), `object1` = polica, `object2 = −1`. Poređenje s programima bokova (`100000051`, `100000052`, grupe od tri rupe Ø5, dubina 9, razmak 32):

- Sredina grupe na **Lijevom boku** je X = (Y police − Y boka) + **40,5**; na **Desnom boku** X = l − (Y police − Y boka) − 40,5 (zrcalno). Pogođeno na svih 10 grupa (5 polica × 2 boka), u 5 polica razmak 308 mm.
- Prvi red je na YA = 50 + 20 = 70 (pozicija naprijed + uvlačenje police 20), zadnji na YA = b − 50 = 450.
- U druga četiri projekta s parovima S3D + program makro `PERFORACIJE_5_RUPA` ne postoji, pa je zaključak izveden iz jednog elementa i jedne debljine police (18). Konstanta 40,5 se ne može razdvojiti na dio od debljine police, dio od `GX = 29,5` i dio od pomaka, dok se ne nađe uzorak s drugom debljinom police ili drugim `RAZMAK`/`BROJ_RUPA`. Zato pravilo nije ugrađeno u izvoz.

## Šarke na vratima (`MAKRO HETTICH`): izvršeno i provjereno na 11 stvarnih vrata

Dekodirani makro (`MSVA` varijable, `MSFO` formule ~4900 znakova, `MSGR` čašice, `MSRA` redovi malih rupa) za vrata (`object1`) ne zavisi od susjeda: koriste se samo visina `V` i dubina `S` vrata, tip otvaranja i varijable elementa (`BR_SARKI`, `BR_SA`, `PRO_SAR`, `S_O`, `SARKA_1…5`). `lib/corpus-hettich-door.ts`:

- **Otvaranje:** `OTVARANJE = tip fronte − 1`: tip 1 daje čašice na `Y = 21,5`, tip 2 na `Y = S − 21,5`. Mali otvori na `Y = 27` odnosno `S − 27`.
- **Broj šarki:** `BR_SARKI = 1` daje `BR_SA`, inače automatski po visini (< 900 → 2, < 1600 → 3, < 2000 → 4, inače 5).
- **Položaji (X duž visine, redoslijed makroa):** prva `100 + SARKA_1`, druga `V − 100 + SARKA_n`, treća (3 ili 5) `V/2 + SARKA_2/3`, četvrta `(V + 200)/4 + SARKA_2` (za 4 šarke `(V + 100)/3`), peta `V − (V + 200)/4 + SARKA_4` (za 4 šarke `SARKA_3`); pomaci važe samo uz `S_O = 1`.
- **Rupe:** čašica Ø35 dubine 14 i po dvije Ø3 dubine 3 na razmaku 52 (±26 od šarke), `BM="LS"`.
- **Provjera:** svih 11 vrata iz Siniša Buić - Ormari (visine 286, 347, 348 i 2326; jedna do pet šarki; tipovi 1 i 2; različiti `SARKA_n`) daje isti skup i isti redoslijed rupa kao Corpusov program, a cijeli `.mpr` je identičan uz izuzetak komentara o rubnim trakama. Rupe na bočnoj stranici (`raster1_*_BOK`, `object2`) nisu izvedene (zavise od susjeda: `DELTA`, `OBJ2.SMJER`, `ZL/ZDE`).
- **Granice:** samo tipovi fronte 1 i 2, `PRO_SAR = 0` i `VISINA ≥ DUBINA`; za ostalo funkcija vraća `null` (ne nagađa). Izvoz: Export → "MPR usjecanja, utori i šarke…".

## `Korpusiranje` (spojevi korpusa): prvo čitanje makroa, još nije izvršeno

Makro (43 veze u Ormari, `object1` = ploča, `object2 = −1` = susjed koji Corpus bira, `CONNECT=23`) računa spoj dvije ploče iz presjeka dodira (`PMAXX`, `PMAXY`) i strane (`OBJ1.AUTOST`, `OBJ2.AUTOST`). Varijable: `TIP_SPAJANJA`, `BRT/BRE/BRK/BRS/BRL`, `POZICIJA_PRVE_GRUPE = 32`, `POZICIJA_POSLEDNJE_GRUPE = 32`, `USKI_POZICIJA = 15`, `DODATNI_TIPLOVI = 200`. Za dodir dužine `PMAXY`:

- broj tiplova: ≤ 120 → 2, ≤ 530 → 3, inače 4 (osim ako je `PMAXY < 15` ili > 2000, tada 0);
- razmak tiplova `(PMAXY − 32 − 32)/(BR_TIPLOVA − 1)`, prvi na 32; za `PMAXY ≤ 200` prvi na 15 i razmak `PMAXY − 30`;
- tipl u `object1` Ø8 dubine 25, u `object2` Ø8 dubine 10, na `GX = PMAXX/2` (debljinsko lijepljenje, `D_L = 1`);
- ekscentri (`GD = sraf_duz`, Ø8 + Ø15 čašica dubine po `eks_duz`) i lamello se dodaju prema `IZBOR_VARIJABLE`.

Provjera na stvarnim programima: Pod (816 × 500 × 18) uz Lijevi_bok daje `PMAXY = 500`, dakle 3 tipla na razmaku 218 (32, 250, 468): tačno `YA = 32, 250, 468` Ø8 dubine 10 u programu boka (`100000051`), a `XA = 9 = 18/2`. Za izvršavanje treba izvesti `PMAXX/PMAXY/PMINX/PMINY` i `AUTOST` iz geometrije dviju ploča i preslikati lokalne koordinate u osu programa; to nije urađeno.

### Spojevi korpusa: pokušaj izvođenja iz geometrije (Siniša Buić - Ormari, 66 ploča)

Pravilo iz istraživačke skripte (nije u kodu): za svaku ploču A s makroom `Korpusiranje` traže se ploče B koje je dodiruju (razmak ≤ 0,6 mm, presjek > 1 mm u obje druge ose); spoj je T (rub uz lice) kad je debljina A duž ose dodira manja od njene mjere, a B ima tu osu kao debljinu. Dužina dodira `PMAXY` = veća strana presjeka, `PMAXX` = debljina A. Tiplova: `PMAXY` < 15 ili > 2000 → 0, ≤ 350 ili ≤ 530 → 3, > 530 → 4, ≤ 120 → 2; razmak `(PMAXY − 64)/(n − 1)`, prvi na 32; u A vodoravni Ø8 dubine 25 na sredini debljine, u B okomiti Ø8 dubine 10 u licu.

- **Broj tiplova:** vodoravnih Ø8/25: **63 od 66** ploča isti kao u programu; okomitih Ø8/10: **62 od 66**. Razlike su jedan tipl više ili manje na ploči (Desni_Bok 18 prema 17, Pregrada 33 prema 32) i nekoliko ploča s drugačijim spojem (`ledja2`, `MASKA_PLAFON`, vrata `FRD`).
- **Koordinate (XA, YA) okomitih tiplova, skup se poklapa:** ploče s `SMJER 0` i zamijenjenim osama 4/4; `SMJER 2` 13/15; `SMJER 0` bez zamjene 6/13. Kod zamijenjenih osa vrijedi Y = lokalno bez zrcaljenja; ostali slučajevi nisu razdvojeni jer su pozicije simetrične.
- **Zaključak:** model je dobar za jednostavne T spojeve ali ne i za sve (ekscentri, lamello, `OBJ2` koji Corpus bira, rubni slučajevi s brojem tiplova). Zato nije ugrađen u izvoz; izvoz bi bio tačan samo za dio ploča i to bi se ne bi moglo znati unaprijed.

#### Smjer ose Z kod ploča (nalaz pri izvođenju spojeva)

Na pločama `Pod` (dubina 230, Z 0) i bokovima (dubina 226, Z −2) stvarne koordinate tiplova (`YA` 34, 115, 196, razmak 81, sredina 115 = sredina poda) slijede ako dubina ploče ide u **negativnu** stranu Z od njenog položaja (bok zauzima Z −228…−2, pod −230…0, presjek 226, `PMAXY = 226`, `(226 − 64)/2 = 81`). S pozitivnim smjerom Z dobije se `PMAXY = 224` i razmak 80, što ne odgovara programu. Pri takvoj postavci `SMJER 2` ploče se poklapaju 14/15 (umjesto 13/15), ali broj tiplova je 61/66 (umjesto 63/66) jer se mijenja koji se susjedi dodiruju; debljina duž Z (leđa, `SMJER 1`) ide u pozitivnu stranu (s tim pravilom broj tiplova d25 pada na 37 od 66, s negativnim smjerom svih ploča ostaje 61). Pravilo za Z još nije jednoznačno, pa spojevi nisu ugrađeni u izvoz.

### Dopuna: odakle dolaze linijski utori (`MODE=3`) — iz makro sekcija `PILA`

Makroi `Ledja.CMK`, `LEDJA_FALC_NUT.CMK`, `BRAVICA.CMK` i `FALC BRAVICA.CMK` imaju sekcije `[PILA1]`/`[PILA2]` (ne `RASTER`): `GX/GY` = početak, `PX/PY` = kraj linije, `GD` = dubina, `PSP` = širina reza (4, 4.2, 20, 40 mm), `GN` = naziv (`FALC`, `FALC_NUT`). To su linijski rezovi pile, pa su dvije rupe `RAS MODE=3` (početak, kraj) vjerovatno izlaz ovih makroa, a `PSP` je `SIR` (u MPR-u `NB`). U `Ledja` makrou su krajevi `PMINY-0.5`/`PMAXY+0.5` (ili ±50 kad je pod/plafon preko), dubina `DUBINA_FALCA_ILI_NUTA+1`. Pravilo osa i značenje `DUB` i dalje nisu provjereni na paru S3D + `.mpr`, pa izvoz `<109 \Nut\` ostaje neugrađen.
`PERFORACIJE.cmk` (`RASTER`, Ø10×5, korak 32, `OBJ1.V/32` rupa) i `PERFORACIJE_3_RUPE.CMK` (3 rupe Ø5×9, korak 32, `CONNECT=23`) dodatni su izvori običnih bušenja (`MODE=1`); `TIPLA ZA LADICE.CMK` i `SARKA_UNIVERZALNA` još nisam razradio.

### Dopuna: `TIPLA ZA LADICE.CMK` (spoj `CONNECT=2345`) — ista porodica kao `Korpusiranje`

Isti obrazac brojanja po `PMAXY`: tiplovi ≤120 → 2, ≤530 → 3, inače 4; ekscentri/šrafovi ≤120 → 1, ≤350 → 2, ≤600 → 3, inače 4; konfirmati ≤120 → 1, ≤530 → 2, inače 3; lamello ≤350 → 1, ≤580 → 2, inače 3. Nema bušenja ispod `PMAXY<15` ni iznad 2000. Pozicija prve grupe 24 (uski komadi ≤200: 15), razmak tiplova `(PMAXY−24−48)/(n−1)`, dodatni tiplovi (2 komada, +64) kad je `PMAXY>200` i `DOD=1`. Dubine: tipl OBJ1 Ø8×18, OBJ2 Ø8×12; ekscentar vijak OBJ1 Ø8×(24|30), OBJ2 Ø8×14; čašica Ø15×14 (`GK` 90° kad je `AUTOST` 2/3); konfirmat OBJ1 Ø5×32, OBJ2 Ø7×18; lamello Ø5×12. Potvrđuje ranije izvedeno pravilo brojanja tipli; ugradnja u izvoz čeka par S3D + `.mpr` za provjeru osa i znaka Z.
