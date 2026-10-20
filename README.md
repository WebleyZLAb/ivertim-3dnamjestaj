# IVERTIM Corpus

Samostalan IVERTIM projekat za čitanje, analizu i kasniju vlastitu implementaciju funkcija Corpus 3D softvera.

## Trenutno stanje

- read-only parser za Corpus `.S3D` projekte
- hijerarhija elemenata i ploča
- frontalni, gornji i bočni 2D nacrt sa automatskim kotama izabranog elementa i lokalnim vektorskim SVG izvozom te interaktivni Three.js 3D prikaz; gornji nacrt koristi puni rotirani X/Z otisak elementa
- standardni prednji, bočni, gornji i početni 3D pogledi
- stvarne lokalne koordinate, rotacije i tri Corpus orijentacije ploča
- prizmatične ploče iz `KRIVULJE` kontura, uključujući složene obrise
- glatka aproksimacija stilova krivulje 1/2 dok se ne potvrde PTPR/PTNE tangente
- materijali, izvorne boje, transparentnost i potrošni materijal
- oznake bušenja sa formulama položaja, prečnikom i dubinom
- read-only prikaz stvarnih RAS proizvodnih parametara uz izabranu ploču
- pregled Corpus makro veza i inventar njihovih kompresovanih formula bez izvršavanja
- potpuna podrška za ponovljene MM1/MM2 C6DAT sekcije (`MSRA×N`, `MSPO×N` i ostale), uz kontrolisano dekodiranje jedne veze da veliki projekti ne zatrpaju interfejs
- simulacija makro-snapshota ugrađenog direktno u S3D/E3D element, bez obaveznog učitavanja eksternog CMK foldera
- ugrađeni snapshot je odvojen od aktuelnog eksternog CMK-a, čuva istorijsku verziju formule i automatski bira zapisani OB1; OB2=-1 ostaje označen kao dinamički Corpus izbor
- ograničeni bezbjedni evaluator Corpus aritmetike, poređenja, IF i AND/OR/NOT izraza bez `eval`-a
- višestruki prolaz za zavisne formule, uz jasno izdvojene nepoznate varijable i cikluse
- audit cijelog foldera S3D projekata bez izmjena izvornih fajlova
- lokalna radna kopija za položaj, dimenzije i sva tri ugla elementa, sa globalnom istorijom do 100 Undo/Redo koraka i vraćanjem originala
- standardne modelerske prečice `Ctrl+Z`, `Ctrl+Y` i `Ctrl+Shift+Z`, bez presretanja lokalnog Undo ponašanja unutar tekstualnih polja
- uređivanje naziva, šifre, klase, vidljivosti, zaključavanja i dozvole uređivanja elementa
- uređivanje položaja, mjera, debljine, orijentacije i uglova pojedinačnih ploča
- uređivanje materijala, boje, providnosti i vidljivosti ploča sa trenutnim 3D osvježavanjem
- ručno dodavanje, izmjena i brisanje osnovnih rupa ploče: Corpus izraz položaja, prečnik, dubina, ravan i ugao, uz Undo i S3D/E3D izvoz
- stvarne 3D šupljine za kroz-bušenja i slijepa bušenja na dokazanim suprotnim glavnim plohama `RPL=0/1`, uključujući cilindrični zid i dno slijepog otvora
- linearna serija rupa po X ili Y osi sa zadanim brojem i razmakom, zapisana kao obične Corpus RXP/RYP operacije
- pravougaona mreža rupa sa redovima, kolonama i nezavisnim X/Y razmakom, ograničena na 500 standardnih Corpus rupa
- kopiranje ili zamjena izabrane rupe ogledalom prema suprotnoj `B` ili `L` ivici, uz parametarske `B-(RXP)` / `L-(RYP)` izraze
- kopiranje ili premještanje izabrane rupe između dokazanih suprotnih glavnih ploha `RPL=0 ↔ RPL=1`, bez promjene lokalnih `RXP/RYP` koordinata
- uređivanje širine, dužine i obje Corpus visine prostorije sa trenutnim 3D osvježavanjem
- precizno postavljanje i SAT provjera rotiranih elemenata uz granice sobe, na mrežu 10 mm ili neposredno uz drugi element sa zadanim razmakom; poravnanje omotača radi po lijevoj/desnoj, prednjoj/zadnjoj, donjoj/gornjoj ivici i centrima sve tri ose
- trenutno mjerenje odnosa dva elementa po X/Y/Z osi, sa jasnom razlikom između razmaka, dodira i dubine preklapanja njihovih rotiranih svjetskih omotača
- šest trenutnih mjera izabranog elementa do zidova, poda i plafona prostorije, sa razlikom između slobodnog prostora, dodira, nepoznate granice i izlaska iz sobe
- automatsko vraćanje cijelog rotiranog omotača elementa unutar svih šest granica sobe, uz podesiv sigurnosni odmak
- automatski raspored svih korijenskih elemenata u X ili Z niz po stvarnim rotiranim omotačima, sa razmakom, odmakom od zida i jednim Undo korakom
- poseban 3D režim `Premjesti` za povlačenje korijenskih elemenata po horizontalnoj ravni, sa mrežom 10 mm i jednim Undo korakom po potezu
- trenutna provjera izlaska elementa iz prostorije i prostornog preklapanja dokazivih osnih omotača
- projektna krojna lista koja grupiše ploče po materijalu i izvornim Corpus mjerama, zadržava trag do elementa, broj rupa i skrivene ploče
- lokalni Excel-prijateljski CSV izvoz krojne liste u UTF-8 formatu sa tačka-zarez separatorom i decimalnim zarezom
- odvojena proizvodna lista POTITEM zapisa: čuva TIP, deklarisani KOMADA zbir, identifikatore, materijal, broj pojavljivanja i STR0–STR3 primjene bez nagađanja dužine rubne trake
- zaseban lokalni CSV izvoz potrošnog materijala i rubnih obrada
- siguran izvoz izmjena u zaseban `.ivertim-corpus.json` fajl bez prepisivanja izvornog S3D-a
- direktno otvaranje samostalnih `.E3D` elemenata i dodavanje jednog E3D elementa u otvoreni S3D projekat
- udvostručavanje bilo kojeg korijenskog elementa; izvorni S3D element se prvo bez gubitka nepoznatih blokova pretvara u lokalni E3D fragment, pa se kopija dodaje kao novi element
- linearni niz do 50 kopija korijenskog elementa sa nezavisnim X/Y/Z razmakom, kao jedna provjerljiva Undo/Redo operacija
- lokalna pretraživa E3D biblioteka: izabere se cijeli `Elmsav` folder, a aplikacija prikaže elemente i njihove podfoldere bez slanja podataka
- lokalna pretraživa CMK biblioteka: izabere se cijeli `Makro` folder, a aplikacija prikazuje sekcije, formule i zavisnosti bez izvršavanja makroa
- bezbjedna CMK simulacija nad izabranim OBJ1/OBJ2 daskama: dokazive vrijednosti RASTER, PILA, POTROSNI, MAKRO i GRUPA operacija računaju se bez izmjene projekta, a nedostajući Corpus runtime kontekst ostaje označen
- kontrolisana primjena potpuno razriješenih RASTER simulacija kao stvarnih rupa na OBJ1 ploči; `GP=0` napreduje po Y, `GP=1` po X za `GR`, dok neriješeni i nedokazani GP režimi ostaju blokirani uz razlog
- read-only RASTER audit nad 2.671 E3D fajlom: 3.958 MSRA sekcija, 51 jedinstven potpis i 0 grešaka dekodiranja; potvrđeni su GP režimi 0/1, dok rijetki GP=2 ostaje neprimijenjen
- opcionalni ručni PMIN/PMAX, DELTA/DELLTA i AUTOST runtime kontekst te izvoz kompletnog CMK simulacijskog dokaza u JSON
- automatski dokazani makro aliasi `SIRINA/VISINA/DUBINA` i `OBJ1/OBJ2.SMJER`; `AUTOST` ostaje ručni šestostrani kontekst jer nije svojstvo same ploče
- automatske lokalne granice ploče `OBJ1/OBJ2.MINX/MAXX/MINY/MAXY` iz stvarne konture (ili pravougaonih mjera) i `OBJ1/OBJ2.GR` za debljinu, sa pregledom svih automatskih vrijednosti u simulaciji
- granice dokaza za makro runtime kontekst dokumentovane su u [`docs/macro-runtime-context.md`](docs/macro-runtime-context.md)
- read-only 3D dijagnostika dodira dvije nerotirane ploče razlikuje površinski spoj, razmak, zapreminsko preklapanje i dodir samo ivicom/tačkom te prikazuje lokalnu stranu obje ploče
- svjetski presjek dodira preslikava se odvojeno u lokalnu radnu ravan `OBJ1` i `OBJ2`, sa jasno označenim lokalnim osama; još se ne proglašava automatskim `PMIN/PMAX`
- read-only audit stvarnih S3D/E3D makro-parova: `pnpm audit:joints "PUTANJA_DO_FOLDERA"`
- read-only audit ravni bušenja: `pnpm audit:holes "PUTANJA_DO_FOLDERA"`; dokazni zbir je u [`docs/hole-plane-evidence.md`](docs/hole-plane-evidence.md)
- parametarski generator osnovnog E3D korpusa sa bokovima, podom, izborom pune gornje ploče ili prednjeg i zadnjeg vezača, ravnomjerno raspoređenim ili ručno visinski postavljenim policama sa nezavisnim prednjim/zadnjim uvlakom te do deset ravnomjerno ili ručno postavljenih unutrašnjih pregrada; police se dijele po stvarnim širinama nastalih polja; podržani su opciono postolje i uvučena cokla, naklopna ili unutar otvora uvučena vrata podijeljena po širini i frontovi ladica podijeljeni po visini, sa jednakim dijelovima ili ručnim omjerima i do deset fronti; poleđina može biti isključena, pločasta unutar korpusa ili tanka HDF poleđina na zadnjoj ravni sa zasebnim materijalom i bojom; vezači koriste dokazani `SMJER=2`, zadani presjek 100 × 18 mm i podesiv zadnji uvlak
- udvostručavanje izabrane ploče u novom ili uvezenom elementu uz očuvanje konture, rupa, obrada i nepoznatih Corpus blokova
- uklanjanje izabrane ploče iz novog ili uvezenog elementa uz potvrdu, Undo/Redo i zaštitu posljednje ploče
- opšte dodavanje nove pravougaone ploče u novi ili uvezeni element: naziv, sve tri Corpus orijentacije, položaj, mjere, materijal, boja, vidljivost i providnost; početne vrijednosti nude gotovu policu
- preimenovanje ploče preko izvornog Corpus `DNAME` atributa uz očuvanje konture, rupa i obrada
- vizuelno uređivanje proizvoljne zatvorene konture ravnih segmenata preko Corpus `KRIVULJE` tačaka: 2D pregled sa numerisanim tačkama, X/Z polja, dodavanje, uklanjanje i promjena redoslijeda, pravougaoni i ugaoni-urez predložak, provjera samopresijecanja i automatsko osvježavanje mjera ploče; dokazani lukovi ostaju zaključani
- dodavanje, zamjena i uklanjanje rubne trake na Corpus `STR0`–`STR3` ivicama ploče uz očuvanje svih POTITEM zapisa koji nisu rubna obrada i trenutno osvježavanje proizvodne liste
- izvoz izabranog uvezenog ili generisanog elementa kao samostalni `-IVERTIM.E3D` za ponovnu upotrebu u biblioteci
- radna kopija verzije 7 čuva i dodane E3D elemente i izmjene rupa, uz čitanje starijih kopija verzija 1–6
- izvoz novog `-IVERTIM.S3D` fajla mijenja samo dokazane atribute i ugrađuje dodane E3D elemente, čuvajući ostali izvorni XML
- automatski testovi bez privatnih projektnih fajlova

Originalni Corpus projekti ostaju izvan repoa, trenutno u `D:\sobasav`.

## Provjera

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm audit:s3d "D:\sobasav"
pnpm audit:s3d:machining "D:\sobasav"
pnpm audit:s3d:c6dat "D:\sobasav"
pnpm audit:s3d:macros "D:\sobasav"
pnpm audit:e3d "D:\CorpusSolutions\Elmsav"
pnpm audit:cmk "D:\CorpusSolutions\Makro"
pnpm audit:cmk:holes "D:\CorpusSolutions\Elmsav" "Korpusiranje"
pnpm audit:cmk:raster "D:\CorpusSolutions\Elmsav"
```

## Granice trenutne rekonstrukcije

- Kroz-bušenja i slijepa bušenja na dokazanim suprotnim glavnim plohama `RPL=0/1` stvarne su šupljine u triangulisanoj geometriji; rijetki `RPL=2` i ostale nedokazane ravni ostaju cilindrični markeri.
- `PTSTYLE=2` koristi kružni luk iz tetive i `PTARRA`; `PTSTYLE=1` ostaje kontrolisana interpolacija dok mu se ne potvrdi izvorna matematika.
- Teksture materijala i proizvodne obrade poput utora, falca i CNC putanja još nisu rekonstruisane.
