# Osnovna edukacija 1/7, koraci 41–46: Utrošeni materijal

Izvor: screenshotovi iz Corpusa 6 (25.11.2026., projekt `Boris Bulic_Kuhinja_1.S3D`, 36 elemenata) i upoređivanje s našim programom na istom projektu. Screenshotovi nisu u repou.

## Šta Corpus prikazuje

Prozor **Utrošeni materijal**, kartice *Ploče* i *Elementi* (kartica Elementi nije snimljena).

- **Materials:** grupe po materijalu i debljini (npr. `W908_ST7 ( 18.0 )`) s ukupnom površinom u m². Pod grupom je po jedan red za svaku ploču: dimenzije (visina × širina), količina 1, površina jedne ploče u m², cijena. Svaki red ima −, + i ✖.
- **Edgebands:** `1mm <dekor ploče> ( <debljina ploče> ) <šifra trake>`, dužina u metrima i cijena po metru. Traka koja nije u katalogu piše `????`.
- **Fittings:** naziv okova, količina, cijena po komadu, ukupno.
- **Dugmad:** Dodaj, Odvoji male daske, Dodaj listu materijala, Izbriši sve, Spremi listu materijala, Spremi narudžbu, Ispiši, Krojna lista, EXPORT, Ručni unos, Kalkulacije, Izlaz. Uz njih: „Primijeni na Sve/Odabrano", „Onemogući računanje marže" (+ prozor marži), kućice *Iverali / Potrošni / Iverali skupno*.
- **Zbir** (Ploče, Rubne trake, Ostalo, UKUPNO) računa samo stavke kojima je zadana cijena.

**Ispiši** otvara stablo šablona po jeziku (Croatian, Eng) s pregledom, dugmadima Edit i Print. Šabloni su FastReport `.fr3` (37 fajlova u `.local-corpus-archive\Template\fr3`). Edit otvara FastReport dizajner.

**Export** ima profile *Ivertim* i *Maretta* i tabelu s kolonama: Dužina, Širina, Duž L/D Šif, Šir Do/Go Šif, God (smjer vlakana), Količina, Šifra i naziv materijala, naziv i šifra elementa, naziv i šifra daske, Program, Primjedba. Za razliku od našeg CSV-a, svaka ploča je poseban red.

## Šta je provjereno na projektu Kuhinja_1

| Stavka | Rezultat |
|---|---|
| Površine po materijalu (10 grupa) | **Poklapa se na dvije decimale** (26,06 / 13,14 / 6,24 / 4,15 / 3,50 / 2,15 / 1,82 / 1,27 / 0,33 / 0,17) |
| Okovi | **Poklapa se tačno** (DRVENA TIPLA 383, KONFIRMAT 176, BAGLAMA RAVNA BLUM 12) |
| Pravila uključivanja | Ne ulaze skrivene ploče, ploče debljine 0 (profili), `TIPFRONTE=5` (noge) i `TIPFRONTE=8` (ulošci). Ostale ploče i sve fronte ulaze. |
| Nazivi materijala | Corpus ih razrješava iz kataloga po UID-u (UID `63A1…` je `K697`). Naš program isto, preko `matchCorpusMaterial`. |
| **Dužine rubnih traka** | **Ne poklapa se.** Vidi dolje. |

### Rubne trake: riješeno (26.11.2026.)

Pravilo (provjereno na svih 6 redova Corpusa, tačno na dvije decimale: K697 164,61 / W908_ST7 64,99 / 7045 62,99 / AGT239 (10) 12,08 / AGT239 (36) 5,02 / W960_ST7 16,14):
- Strane `STR0` i `STR1` su duž **širine** ploče, `STR2` i `STR3` duž **visine**.
- Svaka oblijepljena strana dodaje **80 mm** (dodatak Corpusa).
- Red je po **dekoru trake i debljini ploče** (oznaka `1mm <dekor trake> ( <debljina ploče> ) <šifra trake>`), a ne po materijalu ploče; zato 63A… (K697) trake na W908 pločama ulaze u red K697.
- U popis ulaze iste ploče kao u materijalu (bez skrivenih, debljine 0, tipova 5 i 8), pa trake od 0,5 mm na nogama ne ulaze.
Izvedeno regresijom po svim rasporedima strana i oba načina grupisanja (model dužina + 0,08 × broj strana, ostatak 0,01 m na 5 grupa). Raniji nalaz o „5 %" bio je slučajan.

## Šta je u našem programu

- **Gotovo:** prozor *Kalkulacije → Utrošeni materijal…* (`lib/corpus-used-material.ts`, `src/used-material-window.tsx`). Grupe po materijalu, redovi po ploči, −/+/✖ (samo u prikazu), proširi/skupi sve, ploče, trake i okovi, zbir, dugme Krojna lista.
- **Nije urađeno:** cijene i marže (nema ulaznih podataka), Spremi narudžbu, Dodaj/Spremi listu materijala, Ručni unos, kartica Elementi, Export profili Ivertim/Maretta po ploči (prvo treba uporediti kolone), šabloni izvještaja.

## Dopuna 26.11.2026: izvoz po pločama i strane traka

Iz Corpusovog `export/Ivertim.exp` (arhiva `.local-corpus-archive/export`): redoslijed kolona `9,10,30,31,32,33,13,7,4,6,0,51,1,50,52,3,47,46`, razdjelnik zarez, datoteka `corpus.CSV`. Zaglavlja iz screenshota izvoza: Dužina, Širina, Duž L Šif, Duž D Šif, Šir Do Šif, Šir Go Šif, God, Količina, Šifra Mat, Naziv Mat, Naziv Ele, Šifra Eler, Naziv Daske, Šifra Daske, Naziv Programa, Program, Primjedba8, Primjedba. Profil Maretta ima iste kolone bez zadnje (`46`), a razlikuje se po širinama kolona.

- **Naziv Mat** je `FULLNAME` iz kataloga materijala („HDF/Lesomal BIJELI“, „Osnovna bijela“), **Šifra Mat** je `SIFRA`, **God** je `GOD=-1`.
- **Trake:** ploče sa `STR=0010` (traka na strani 2) Corpus pokazuje u koloni **Duž L Šif**. Šifra trake je iz kataloga (`1_K697`, `1_BJL H`: debljina + dekor, uža 22 mm kao zadana). Duž (L, D) pripada `STR2` i `STR3`, Šir (Do, Go) pripada `STR0` i `STR1` (potvrđeno računom dužina). Redoslijed unutar para (Duž D = STR3, Šir Do = STR0, Šir Go = STR1) je pretpostavka.
- **Redovi:** po jedan za ploču, grupisani po materijalu, unutar materijala redoslijedom elemenata.
- **U programu:** *Utrošeni materijal → Export (CSV po pločama)* (`lib/corpus-board-export.ts`). Zaglavlje se ne upisuje (u Corpus profilu ga nema), a decimale su sa dvije cifre i tačkom kao u prikazu Corpusa. Nije provjereno protiv stvarnog Corpus CSV-a (nije bilo kopije fajla), pa treba uporediti jedan izvoz.
- U prozoru Utrošeni materijal trake sada pišu kao u Corpusu: `1mm <materijal ploče> ( 18 ) <šifra trake>`; šifre trake ulaze i u izvještaje (`DEH1CODE` … `DEW2CODE`).

## Dopuna 26.11.2026: cijene i zbirovi (poklapaju se sa Corpusom)

Gdje su cijene u Corpusu:
- **Ploče:** polje `CIJENA` u `MatDat.MXC` je niz paralelan sa nizom debljina `DEB`; cijena po m² je `CIJENA[i]` za debljinu `DEB[i]`.
- **Okovi:** `Data Cijena` (po komadu) u `Potrosni/*.cxm`; veza sa stavkom iz S3D-a je `Dodatno OznId` = `UID` stavke. Cijene se čitaju pri uvozu biblioteke u `manifest.json` (`fittingPrices`); za postojeću biblioteku: `node --experimental-strip-types scripts/refresh-fitting-prices.ts public dist`.
- **Trake:** `Cijena` po metru u `Potrosni/05mm|1mm|2mm.cxm` (u ovom projektu sve 0).

Provjera na Kuhinja_1 (Corpus: Ploče 34,48; Rubne trake 0,00; Ostalo 13,43; UKUPNO 47,91):
- W960_ST7 (16): 1,816 m² × 15,07 = **27,37**; U999_ST19 (18): 0,33 m² × 21,56 = **7,11**; zbir ploča **34,48**.
- Okovi: KONFIRMAT 176 × 0,05 = 8,80; DRVENA TIPLA 383 × 0,01 = 3,83; Corpus_metal_shelf_support 8 × 0,10 = 0,80; zbir **13,43**.
- Ukupno **47,91**, bez marže. Zbir računa samo stavke koje u katalogu imaju cijenu.

Prozor Utrošeni materijal sada ima kolonu Iznos i zbir Ploče / Rubne trake / Ostalo / UKUPNO. Marže (grupe marži, „Onemogući računanje marže") još nisu urađene.

## Dopuna 26.11.2026: kartica Elementi

Kartica Elementi u Corpusu nije snimljena. U našem prozoru je to pregled potrošnje **po korijenskim elementima** (36 elemenata u Kuhinji_1, isto kao „Element qty: 36" u Corpusu): ploče, površina i iznos, a raširen red daje materijale i debljine tog elementa. Izveden je iz istih podataka i pravila kao popis materijala; raspored ne mora biti isti kao u Corpusu. Zbir po elementima se razlikuje od ukupnog za stotinku zbog zaokruživanja po elementu.

## Dopuna 26.11.2026: marže

Corpusovi `MtDefMar.cfg` i `FitDefMar.cfg` (`PriceMarginDefault`) definišu grupe marži: **Osnovni** i **Grupa 1–5**, svaka sa `ACT` (aktivna) i `VAL` (procenat); sve zadano na nulu. Lekcija (korak 55–56): marža iz grupe važi samo kad je grupa odabrana na padajućem izborniku, a postoji i kućica „Onemogući računanje marže".

U programu: panel *Marže* u prozoru Utrošeni materijal: osnovna marža u procentima za ploče, rubne trake i okove (ostalo) plus kućica za onemogućavanje, pamti se u pregledniku (`ivertim.usedMaterialMargins`). Zadano 0 %, pa zbir ostaje kao u Corpusu (47,91). **Nije podržano:** grupe 1–5 i dodjela grupa stavkama (polja `MARZA1..5` u stavkama okova imaju vrijednost −1; njihovo značenje nije dokumentovano).

## Provjera izvoza po pločama protiv pravih Corpus CSV-ova (26.11.2026.)

Izvor: `Desktop\IVERTIM - Laptop\CORPUS CSV Export\` (~60 pravih izvoza iz Corpusa, profil Ivertim, bez zaglavlja, ASCII, razdjelnik zarez, CRLF). Poređeno za pet projekata koje imam i kao S3D (Nikica uzglavlje, Tijana, ormari Siniša, Komplet kuća); redovi su poklapani po dimenzijama, elementu i nazivu daske. CSV-ovi su izvezeni u starijim stanjima projekata (i s drugim katalozima na laptopu), pa broj redova ne mora biti isti; mjerilo je slaganje kolona na redovima koji se poklapaju.

| Projekat | Redova naš / Corpus | Dimenzije, trake, vlakna, šifra mat., element, daska |
|---|---|---|
| Nikica uzglavlje | 11 / 11 | **11 od 11 redova, sve kolone** osim broja programa |
| Tijana | 107 / 102 | 91–96 od 96 (trake 91–94, količina 94) |
| ormari Siniša | 83 / 96 | 68–73 od 73, program 73/73 |
| Komplet kuća | 279 / 261 | 240–246 od 246 (trake 245), program 246/246 |

Pravila potvrđena ovim poređenjem (i ugrađena u `lib/corpus-board-export.ts`):
- **Trake:** Duž L = `STR2`, Duž D = `STR3`, Šir Do = `STR0`, Šir Go = `STR1` (potvrđeno na stotinama redova). Raniji nalaz o dužini trake (STR0/STR1 duž širine, STR2/STR3 duž visine) se slaže s ovim.
- **Širina trake:** 22 mm za ploče 18 mm (`1_K003`), 42 mm za radnu plohu 38 mm (`1S_K003`); bira se najuža traka koja pokriva debljinu ploče + 2 mm. Dekor trake iz kataloga može se razlikovati između računara (laptop: `1_ORAH`, ovdje `1_0729`).
- **Naziv Mat** je `FULLNAME` iz kataloga, prazan kad ga katalog nema.
- **Naziv Ele / Šifra Eler:** element koji neposredno sadrži dasku (npr. `Fronta`) i razvijen `ESIFRA` tog elementa. **Šifra Daske** je razvijen `DSIFRA` daske. Makroi: `%NE%` vlastiti naziv, `%TPNE%` naziv korijenskog elementa, `%TPSE%` razvijena šifra korijenskog elementa, `%KMC%` i `%KMPO%` = "0" (npr. `Radna_Ploha00`, `Radna_Ploha100Radna_Ploha00`). `%ND%` je naziv daske (npr. „PLAFON“), a `%SM%` šifra materijala (cokla u materijalu 7045 → „7045“); potvrđeno na Kuhinji_2 i Tijani.
- **Program** (kolona 16) je atribut `PROGRAM` daske (broj tipa 100000028 koji Corpus dodijeli pri izvozu i spremi u S3D); u koloni 15 (naziv programa) je uvijek prazno.
- **Količina:** police (`TIPDASKE=2`) bez programa spajaju se u jedan red s količinom 2; u elementu koji je već izvožen spajaju se sve ploče bez programa. Ploče s programom su uvijek zasebni redovi. Ne može se izračunati kad S3D još nema brojeve programa (Corpus tada zna koje su ploče obrađene). Probano je i spajanje istih ploča između različitih elemenata istog naziva (Corpus to ponekad radi: četiri „Grupa“ s po jednom daskom → količina 4), ali je ukupno slaganje količina bilo lošije (719 naspram 735), pa se ne radi.
- **Tekst je ASCII:** č, ć, š, ž → c, c, s, z (đ → d je pretpostavka); CSV nema BOM.

Ostaje nesrazmjer: ~5–10 % redova se ne poklapa jer su CSV-ovi iz starijih stanja projekata, nekoliko količina (spajanje u neizvoženim elementima) i dekor trake po katalogu računara.

### Dopuna: automatsko uparivanje svih S3D-ova i CSV-ova (26.11.2026.)

Svih ~40 S3D projekata iz `sobasav`, `Downloads` i `Desktop` upareno je sa CSV-ovima po dimenzijama ploča; 12 parova sa sličnošću 72–100 %, **1214 poklopljenih redova**. Slaganje po kolonama: dimenzije 100 %, naziv elementa 100 %, naziv daske 100 %, šifra daske 99,8 %, šifra elementa 98,6 %, vlakna 98,2 %, količina 94,7 %, šifra materijala 87,6 %. Trake (73–86 %) se ne poklapaju samo zbog **naziva kataloga** (stariji katalog je pisao `1MM_5981`, sadašnji `1_5981`); logika traka je ista. Količine se razlikuju gdje je S3D noviji od CSV-a (u S3D-u već ima brojeva programa koje CSV nema, pa Corpus u CSV-u spaja iste ploče). Traka koje nema u katalogu piše se `????` kao u Corpusu.

## Zbrajanje istih ploča (opcija)

Izvoz po pločama i krojna lista po zadanom zbrajaju identične ploče u jedan red s većom količinom. To ne valja kad se ploče razlikuju po bušenju (npr. šarke na lijevim i desnim vratima). Zato postoji opcija "ne zbrajaj":

- Export → "CSV po pločama, ne zbrajaj iste…" (`corpusBoardExportRows(..., { merge: false })`), svaka ploča je red s količinom 1.00.
- Krojna lista → kvačica "Ne zbrajaj iste ploče" (`buildCorpusCutList(..., { separate: true })`).
