# Corpus binarni podaci — čitač, šeme i provjere

Datum: 25.10.2026. Ovaj prolaz rješava čitanje Corpus konfiguracionih objektnih tokova i binarnih blokova u potrošnim katalozima. Svi ulazi su lokalne kopije; izvorni Corpus fajlovi nisu prepisivani.

## Konkretan rezultat

| Podaci | Pročitano |
|---|---:|
| Samostalne binarne konfiguracije/registri | 23 od 23, 286.620 bajtova |
| Definicije varijabli iz tri EVarList datoteke | 138 |
| Alati KDT610 | 18 |
| Alati KDT612 | 18 |
| Važeći predefinisani tipovi bušenja | 70 |
| Tipovi bušenja iz starijeg backup-a | 67, zadržani zasebno |
| Binarni zapisi unutar CXM/PXM kataloga | 51.350 |
| Različiti ugrađeni binarni blokovi | 44.231, svi pročitani bez greške |

Svaki od 23 fajla pročitan je kao jedno potpuno zatvoreno objektno stablo. Zapis nazad u memoriju daje iste bajtove i hash. Isto je provjereno za sve različite ugrađene blokove. Ovo potvrđuje granice i očuvanje podataka; nije dokaz da već razumijemo poslovnu svrhu svake zastavice.

## Šta je implementirano

- `lib/corpus-binary.ts`: strogi čitač tipiziranih vrijednosti, ugniježđenih lista i eksplicitno mapiranih netipiziranih blokova; povratni zapis koji čuva izvorne string i brojčane bitove.
- `lib/corpus-binary-schema.ts`: imenovani objekti/polja, EVarList varijable, alati i predefinisani tipovi bušenja. Nepoznata polja ostaju u stablu, sa adresom i izvornom oznakom.
- `scripts/audit-corpus-binary.ts`: provjera svih samostalnih fajlova, korijenskog stabla, brojeva zapisa i identičnog povratnog zapisa.
- `scripts/audit-corpus-embedded-binary.ts`: provjera DPKSEXTRA i FKOMPARL2 blokova iz potrošnih XML kataloga.
- `tests/corpus-binary.test.ts`: osam testova brojčanih/string zapisa, sirovih nizova s nulama, varijabli, alata, nepoznatih verzija i nevažećih ulaza.

Opšti support audit sada takođe koristi novi čitač umjesto prethodnog približnog izdvajanja tokena.

## Format i šta je ranije zaustavljalo čitanje

Osnovne oznake odgovaraju Delphi TReader/TWriter vrijednostima. To potvrđuje zvanična lista [TValueType](https://docwiki.embarcadero.com/Libraries/Sydney/en/System.Classes.TValueType), dok [ReadListBegin](https://docwiki.embarcadero.com/Libraries/Sydney/en/System.Classes.TReader.ReadListBegin) opisuje početak i kraj ugniježđenih lista. Corpus dodatno serijalizuje klase, njihove verzije i imenovana polja, a neka polja piše kao sirove nizove bez oznake tipa svakog člana.

Popravljeni konkretni slučajevi:

| Mjesto | Stvarni problem prethodnog čitača | Sada |
|---|---|---|
| Buttons.dat | Poslije veličine BMP bloka dolaze sirovi bajtovi, uključujući padding | Broj bajtova se poštuje; cijeli blok se čuva |
| DOCset.dat | Odabrani tipovi/boje i položaji eksplodiranog prikaza imaju sirove nizove | Mapirane granice i veličine tih polja u uočenim klasama |
| DefKotaText.dat | Smjer i boja nisu pojedinačno označeni tokeni | Float32 nizovi; preostali bord zapis sačuvan kao sirovi rekord |
| docInsta.dat | Veličine, boje i XYZ tačke nacrta su sirovi blokovi | Broj tačaka i stride određuju granice; nule više ne prekidaju listu |
| PriceMarginDefault | Dvije uočene varijante čuvaju šest vrijednosti u 60 ili 48 bajtova | Odvojeni Extended i Double nizovi; razlika prepoznata po prisustvu UQ polja u uočenim fajlovima |
| EVarList | Serijalizovani Group ima poziciona polja i zasebnu listu izbora | Sačuvane vrijednosti, opisi i opcije su dostupni |
| TCTLIST | Katalog nosi deklarisani broj alata i različite klase | Broj se provjerava, podaci se ne gube pri promjeni klase |

Ove dodatne Corpus šeme izvedene su iz stvarnih lokalnih fajlova i provjerene cjelovitim povratnim zapisom. Zvanična Delphi dokumentacija ne opisuje Corpusova vlastita polja.

## Varijable: sada čitljivi podaci

- `calculation.cvar`: 2 definicije;
- `sprawdzanie_zawiasu.cvar`: 5 definicija;
- `MakroVarValues.dat`: 131 definicija.

Čitač izdvaja ime, sačuvanu vrijednost, numerički tip kontrole, opis, grupu, pomoćni tekst i opcije. Sačuvana vrijednost nije bez dodatnog dokaza proglašena tvorničkom početnom vrijednošću.

Svih 12 pozicionih članova Group zapisa ostaje dostupno. Položaji s jasnim imenima/tekstovima mapirani su u navedena polja; ostale numeričke i logičke zastavice zadržavaju svoj indeks i tip. Njihova tačna funkcija nije izmišljena. Primjeri stvarnih podataka uključuju SYMETRIA, izbor tipa spoja i proizvođačke izbore za šarke.

Ovo je dodatnih 138 binarnih definicija, odvojeno od 187 tekstualnih definicija prethodno pronađenih preko vvf.dat. Mogu se preklapati po imenima i ne smiju se slijepo sabrati u jedan skup bez definisanog prioriteta.

## Alati, mašine i bušenja

`KDT610.tooldat` i `KDT612.tooldat` imaju po 18 alata. Razlikuju se klase TACTD/TACTM/TACTS. Izvorna polja `na`, `to` i `dia` dostupna su kao naziv, broj alata i prečnik; sačuvana su i sva druga imenovana polja. Negativni brojevi se ne pretvaraju automatski u pozitivne brojeve alata.

`CNCMSetup.dat` ima 16 imenovanih objekata: listu setup-a, aktivni KDT610 setup, regularnu obradu, postprocesorski opis, gornje/donje operacije, glodanje, ulaz/izlaz, opšte putanje i parametre mašine. `NestMSetup.dat` sadrži jednu korijensku listu bez stavki. Nije proizvoljno spojen sa CNC setup-om.

`PredefinedDrillData.dat` sadrži 70 redova sa identitetom, parom brojčanih parametara, režimom, dvije zastavice i nazivom. Stariji backup ima 67. Parovi poput 35/14 odgovaraju očekivanom prečniku i dubini čašice po opisima; u projekciji su označeni kao kandidati diameterCandidate/depthCandidate dok se vezivanje svake zastavice i kontrole ne potvrdi u izvornom programu. To sprječava lažnu sigurnost pri generisanju CNC izlaza.

## Ostali pročitani objekti

- `Buttons.dat`: 32 objekta; nazivi, veze, akcije i ugrađeni bitmap blokovi. Otvorene su stare lokalne putanje, ali nisu automatski aktivirane.
- `DOCset.dat`: 65 objekata postavki nacrta/presjeka i prikaza.
- `DefKotaText.dat`: 2 objekta kota i teksta.
- `docInsta.dat`: 91 objekat kategorija, oblika, boja i geometrije instalacionih oznaka.
- Pet `PriceMarginDefault` datoteka: zadržane zasebne config/system varijante, uključujući kategorije cijena.
- `CalcTemplateList.dat`, `CUsluge.dat`, `NestToolFilter.dat`: strukturno pročitane liste; prazne liste ostaju prazne.
- `TDPKS.dkps`: 14 objekata grupa/kategorija potrošnog.
- `MakroCollection.dat`: registar mkc/mki sa 7 objekata, uključujući 6 stavki makroa, njihove nazive, kategorije i putanje.

## Binarni sadržaj unutar XML-a

DPKSEXTRA i FKOMPARL2 sadrže HEX zapis istog tipa tokova. Pronađeno je 51.350 pojavljivanja, odnosno 44.231 različit blok:

- 22.117 različitih POTEX blokova;
- 22.114 različitih TPARLIST blokova.

Svi imaju cjelovito korijensko stablo, imenovana polja i identičan povratni zapis. Različiti blokovi često se razlikuju po identitetima; broj blokova nije broj različitih poslovnih algoritama. Pozicionim i nepoznatim poljima nisu dodijeljeni izmišljeni nazivi.

## Granice i upotreba

Čitanje i očuvanje ovog skupa binarnih podataka sada radi. Povezivanje njihovih poslovnih značenja s našim konstrukcionim i proizvodnim mehanizmom radi se po konkretnim šemama. Ovim prolazom nisu promijenjeni elementi, izbori varijabli, geometrija, mašinski izlaz niti originalni Corpus fajlovi.

Povratni zapis je namijenjen provjeri očuvanja pročitanog stabla. Za stringove i realne brojeve originalni rawHex ostaje mjerodavan; ovo nije opšti editor koji prihvata promjenu samo value svojstva i pretpostavlja novo kodiranje. Novi proizvodni writer mora imati eksplicitne, testirane izmjene polja i provjeru na kopiji prije primjene.

Standardni vaCollection marker namjerno se odbija jer nije zatečen u ovim podacima; ne tvrdi se podrška za svaki Delphi/VCL format. Za dokumentne i grafičke sirove zapise granice su potvrđene, ali nisu sva njihova polja poslovno imenovana. DLL/EXE, fontovi, keš baze, formati zaštite i sve moguće druge biblioteke ne ulaze u tvrdnju o riješenim 23 konfiguraciona fajla.

## Ponovljiva provjera

```powershell
npm run audit:binary
npm run audit:binary:embedded
npm test
npm run build
```

Rezultati su u `.local-corpus-archive/analysis/binary-reader-results.json`, `binary/` i `embedded-binary-results.json`. Sirovi podaci ostaju ignorisani u Gitu, a testovi koriste male sintetičke primjere. Svih 240 testova, typecheck i build prolaze.

## Dodatno potvrđena veza padajućih izbora
Stvarno ime varijable sa korisnikovog prikaza TIP_SPAJANJA je t_b. Config varvalues.dat sekcija [t_b] daje CAPTION=TIP_SPAJANJA, CATEGORY=TEHNOLOGIJA i KONFIRMAT+TIPL=2; korisnički makro ima _t_b=0. Detalji i važno razlikovanje od zasebne makro varijable TIP_SPAJANJA: docs/corpus-variable-dropdowns.md.
