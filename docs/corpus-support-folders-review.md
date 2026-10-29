# Pregled Corpus podrške: config, system i ostali folderi

Datum: 25.10.2026. Izvor: lokalna instalacija `C:\CorpusSoftware64\CorpusSolutions`. Svi navedeni folderi prethodno su kopirani; ovaj prolaz dodaje sadržajnu analizu i provjeru zavisnosti. Originalne postavke nisu mijenjane našim auditom.

## Šta je u kojem folderu

| Folder | Potvrđen sadržaj | Značaj za Ivertim 3D |
|---|---|---|
| config | Konstante, opisi i izbori varijabli, njihove liste, uvozni šabloni, dobavljačke postavke, tabele i serijalizovani objekti | Potreban izvor za poznate nazive, padajuće izbore, početne postavke i pravilno tumačenje podataka |
| export | Maretta.exp sa redoslijedom kolona, delimiterima, širinama i izlaznim odredištem CSV-a | Dokaz konkretnog izvoznog rasporeda; sam šablon ne objašnjava značenje svih numeričkih ID-jeva kolona |
| katalog | Pretežno slike proizvoda/okova, jedna PDF datoteka i keš baze | Prateće slike i dokumenti; šifre i parametri su u potrošnim katalozima, ne u samoj slici |
| Masine | Serijalizovani setup mašina, među njima KDT610 | Izbor postprocesora, obrada, orijentacije i izlaza; sama kopija ne daje naš funkcionalan CNC postprocesor |
| Potrosni | 27 CXM, 26 PXM, XML lista grupa i dodatni DKPS podaci | Pored kant traka postoje dobavljački okovi, parametri i veze prema potrošnim stavkama |
| system | Postavke programa/CNC-a, podrazumijevani spojevi, tipovi ploča, definicije bušenja, lokalna pomoć, prevodi, fontovi, slike, biblioteke i dodatni formati | Važna dokumentacija stvarnog Corpus modela, ali i mnogo podataka koji pripadaju samo starom interfejsu |
| Template | 37 FastReport FR3 izvještaja i šest ODS dokumenata | Primjeri štampanja, dataset veza i izgleda dokumenata; nisu naš aktivni renderer |
| Tool | KDT610/KDT612 alati i tekstualne postprocesorske/ulazno-izlazne definicije | Veza između operacije, alata i ciljne mašine; tumačiti zajedno sa Masine |

Aktivni Potrosni je u `public/local-corpus/Potrosni`. Ostali pregledani folderi su u `.local-corpus-archive`. Podaci su lokalni i ignorisani u Gitu; arhiva ne ulazi u web build.

## Config i varijable — šta je dokazano

`config/vvf.dat` navodi 11 datoteka s ukupno 187 definicija varijabli. Tu su nazivi, prikazani opisi i ponuđene vrijednosti. Postoje i drugi katalozi izbora koji nisu u toj podrazumijevanoj listi, npr. HettichVars.dat, kao i opcioni simpleblue.vvf. Ne treba svaki pronađeni katalog nekritički uključiti u isti globalni prostor.

Konkretne korisničke definicije iz `varvalues.dat`:

| Varijabla | Vrijednosti |
|---|---|
| TIP_PODA | 0 upadajući, 1 noseći |
| TIP_PLAFONA | 0 vezači, 1 top, 2 upadajući plafon |
| TIP_LEDJA | 0 falc, 1 nut, 2 nakucavanje, 3 puna leđa, 4 bez leđa |
| VIDLJIVOST_NOGICA | 0 da, 1 ne |
| POLOZAJ_VEZACA | 0 horizontalno, 1 vertikalno |

Ovi fajlovi daju značenje izbora, a ne zamjenjuju formule koje iz tog izbora stvaraju geometriju ili uključuju skriptu.

`SysConst.dat` ima 15 SC_ konstanti: otpad i zarada, širina/odmak ojačanja, odmak leđa i dubine nuta, pomaci poda i odmak nogica. U njegovoj kopiji su, na primjer, SC_stren_w=80 i SC_Leg_Offset=50. To nisu automatski pravila koja želimo primijeniti na svaki naš novi element.

`calculation.cvar`, `sprawdzanie_zawiasu.cvar` i `MakroVarValues.dat` su binarno serijalizovane EVarList strukture. Read-only pregled tokena čuva vrijednosti i stringove, ali potpuna semantika svakog pozicionog polja nije proglašena završenom. To nisu obični tekstualni fajlovi s formulama.

### Provjera stvarnog uzroka nedostajućih vrijednosti

Nad 5.176 E3D fajlova analizirano je 18.962 elementa/pod-elementa i 42.262 deklarisane EVAR varijable. Analiza je koristila isti ograničeni kontekst numeričkih dimenzija kao trenutni editor.

- U samim deklarisanim EVAR izrazima nije pronađena direktna SC_ referenca.
- Bez SC_ konstanti i s njima rezultat je isti: 10.656 dodjela označenih kao missing; dodavanje konstanti nije riješilo nijednu.
- Česte neriješene reference su DEPTH/WIDTH/HEIGHT, BOTTOM.Y, BOTTOM.THICKNESS, BACK.THICKNESS, reference na imenovane dijelove, PARENT.* i EVAR.*.

Ovo je dokaz o deklarisanim EVAR izrazima pod trenutnim ograničenim evaluatorom. Ne obuhvata automatski svaku geometrijsku formulu, Pascal skriptu ili stanje izvornog Corpus programa. Zato ne možemo potvrditi da je retailerova ranija izjava bila pogrešna. Možemo potvrditi da samo kopiranje config foldera ne popunjava odnose među objektima u našem evaluatoru.

Sljedeći smislen korak za parametarski mehanizam je eksplicitan kontekst trenutnog objekta, roditelja, imenovanih ploča i elementnih varijabli; zatim kontrolisano ponovno računanje konstrukcije i skripti sa zajedničkim Undo-om. Opise iz config treba vezati uz konkretna polja i izbore, bez nagađanja početnih vrijednosti.

## System — najvažniji novi izvori

`LNG/Croatian/FormulaHelp.txt` dokumentuje HEIGHT/H, WIDTH/W, DEPTH/D, THICKNESS/Th, položaje, uglove, debljine traka ETH1–ETH4, tip objekta, podrazumijevane dimenzije i kategorije materijala. Time se potvrđuje da su i engleski aliasi stvarni dio modela; trenutni editor ih još ne isporučuje sve u svakom kontekstu.

`LNG/Croatian/MakroHlp.txt` opisuje OBJ1/OBJ2, izbor drugog objekta preko JOINT, kontekst preklopa PMIN/PMAX, sekcije RASTER/GRUPA/PILA/MAKRO/POTROSNI/POCKET i obradu rubova. Pomaže da značenja ne izvodimo samo iz naziva.

Potvrđena važna pravila iz pomoći:

- Za RASTER/GRUPA/PILA/MAKRO, J=0 bira OBJ1, J=1 bira OBJ2. To nije opšti prekidač uključeno/isključeno.
- JOINT ne može koristiti OBJ2 prije nego što je taj objekat pronađen.
- CONNECT uključuje automatsko traženje preklopa. Navedeni podrazumijevani MinDistance/MaxDistance su 0/1 kada nisu zadati.
- Makro varijabla s početnim `_` prenosi se u varijable elementa; u makrou se koristi bez tog prefiksa.
- Za RASTER: GB broj, GD dubina, GF prečnik, GR razmak, GS ploha.

Pomoć i dalje zahtijeva praktičnu potvrdu orijentacija i postprocesora prije proizvodnog izlaza.

`Default.CDS` je XML s pravilima koja povezuju vrste ploča s makroima; u pregledanoj kopiji su njegove ACT zastavice false. `TipDaske.dat` nabraja tipove ploča. `PredefinedDrillData.dat` i backup sadrže serijalizovane definicije bušenja za dobavljačke sisteme. `Cmakro.ini` opisuje izgled editora koda, `Skripte.ini` geometriju njegovog prozora; oni sami ne računaju konstrukciju. `CNCSetup.ini` navodi KDT610 i naziv pratećeg CNC paketa. `Project.toc.back` je dodatna XML mapa dvije skriptne komande, a ne izvršni kod tih skripti.

DLL, baze keša, fontovi, slike i CCF/ostali neprotumačeni podaci sačuvani su. Nije rađeno izvršavanje biblioteka ni mijenjanje zaštite programa. Četiri serijalizovana fajla ostala su samo djelimično čitljiva; njihova semantika nije izmišljena.

## Obim i provjere

Strukturni audit obuhvatio je 22.905 fajlova iz svih traženih foldera. Čitljivi tekstovi, uključujući UTF-16 jezičke/pomoćne datoteke, pregledani su kao tekst; binarni zapisi su klasifikovani i gdje je moguće pročitani kao tokeni. Slike su inventarisane, a ne pojedinačno ručno ocjenjivane kao dekori.

Svih 54 XML datoteka u Potrosni strukturno je parsirano bez greške: tri Trake, 24 Potrosni, 26 Param i jedna LISTAGRUPA. Svih 37 FR3 i devet XLSX/ODS datoteka iz config/Template otvoreno je za provjeru strukture bez greške; ovo nije potvrda njihovog vizuelnog štampanja u našem programu.

Lokalni sirovi izvještaji su u `.local-corpus-archive/analysis/`: support-folder-audit.json, config-variable-map.json, consumable-xml-audit.json i document-template-audit.json. Ponovljive read-only skripte su u `scripts/audit-corpus-*`.

Editor materijala detaljno je obrađen u `docs/material-editor-review.md`.

## Naknadno riješeno binarno čitanje
Prvobitni nepotpuni čitač zamijenjen je provjerenim strukturisanim čitačem. Svih 23 konfiguraciona/registraciona fajla sada daje cjelovito stablo i identičan povratni zapis; pročitani su i svi 44.231 različiti ugrađeni blokovi. Poslovno značenje nepoznatih zastavica ostaje odvojeno od strukturnog čitanja. Detalji docs/corpus-binary-formats.md.
