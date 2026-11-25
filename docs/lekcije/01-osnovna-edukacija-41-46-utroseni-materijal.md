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

### Rubne trake: otvoreno

Strane trake (`STR0`–`STR3`): rasporedi koji daju Corpusove dužine za grupe W960_ST7 (16) i AGT239 (36) su strane 0 i 2 po visini, 1 i 3 po širini, uz dodatak od **5 %** (15,37 m → 16,14 m; 4,78 m → 5,02 m). Za ostale 4 grupe (K697, W908_ST7, 7045, AGT239 10) isti račun ne daje Corpusove brojeve. Suma ukupnih dužina razlikuje se za oko 12 m, a Corpus traka debljine 0,5 mm uopće ne prikazuje. Raspodjela traka po grupama mora imati još neko pravilo (druga mapa strana za fronte ili dodjela po materijalu trake, a ne ploče). Za sada naš prozor prikazuje **neto dužinu** i to jasno piše.

## Šta je u našem programu

- **Gotovo:** prozor *Kalkulacije → Utrošeni materijal…* (`lib/corpus-used-material.ts`, `src/used-material-window.tsx`). Grupe po materijalu, redovi po ploči, −/+/✖ (samo u prikazu), proširi/skupi sve, ploče, trake i okovi, zbir, dugme Krojna lista.
- **Nije urađeno:** cijene i marže (nema ulaznih podataka), Spremi narudžbu, Dodaj/Spremi listu materijala, Ručni unos, kartica Elementi, Export profili Ivertim/Maretta po ploči (prvo treba uporediti kolone), šabloni izvještaja.
