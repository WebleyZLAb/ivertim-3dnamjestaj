# Ivertim 3D

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
- precizno lokalno poravnanje nerotirane ploče uz lijevu/desnu, donju/gornju i prednju/zadnju granicu omotača elementa ili po centru sve tri ose, sa kontrolisanim unutrašnjim odmakom i bez nagađanja rotiranih ploča
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
- višestruki izbor korijenskih elemenata pojedinačno iz stabla, Ctrl/Shift+klikom u 3D prikazu, odjednom za cijeli projekat ili samo za rezultate pretrage, uz `Esc` za čišćenje i posebno 3D isticanje; prikazuju se ukupna širina, visina i dubina njihovog rotiranog svjetskog omotača te svih šest udaljenosti do granica sobe, uključujući jasan izlazak van sobe; grupa se može sakriti, prikazati ili izolovati od ostalih korijena; podržani su zajedničko X/Y/Z pomjeranje, grupno 3D povlačenje, rotacija oko prvog označenog Corpus pivota, poravnanje svih ivica i centara prema tom sidru, ravnomjerna raspodjela stvarnih rotiranih omotača po X/Y/Z osi između krajnjih elemenata te slaganje prostornim redom sa tačno zadanim razmakom po bilo kojoj osi; cijela grupa se može centrirati po bilo kojoj osi prostorije, postaviti uz svih šest granica sa odmakom, vratiti unutar sobe, postaviti na mrežu, nezavisno kopirati jednom, kao seriju do 50 ponavljanja ili kao 2D mrežu sa nezavisnim X/Y/Z korakom kolona i redova, odnosno zajedno ukloniti kada sadrži samo dodane elemente, bez promjene izvornih fajlova i sa jednom Undo operacijom
- Corpus `ELOCKED` i `EEDITABLE` zaštita se poštuje u pojedinačnoj i grupnoj geometriji, 3D pomjeranju, uređivanju ploča i bušenja te uklanjanju; identitet i stanje ostaju dostupni da korisnik može svjesno otključati element, dok pregled, vidljivost i nedestruktivno kopiranje ostaju dozvoljeni
- precizno pomjeranje aktivnog elementa ili označene grupe tastaturom: strelice pomjeraju po X/Z, `PageUp`/`PageDown` po Y, osnovni korak je 10 mm, a uz `Shift` 1 mm; držanje tipke se ignoriše kako bi svaki svjesni pritisak ostao jedan Undo korak
- tastaturna rotacija aktivnog elementa ili grupe: `Q` i `E` daju −90°/+90°, a `Shift+Q` i `Shift+E` fini korak od −1°/+1° oko Corpus pivota; ugao se normalizuje i zaštita zaključanih elemenata ostaje aktivna; uz aktivnu ili grupno označenu ploču komanda staje fail-closed umjesto da neočekivano rotira cijeli element
- `Ctrl+D` kopira aktivni korijenski element ili označenu grupu sa odmakom od 100 mm iza njenog X omotača; `Delete`/`Backspace` uz potvrdu uklanja samo elemente dodane u radnu kopiju, nikada izvorne S3D/E3D korijene
- precizno grupno pozicioniranje postavlja minimalni ugao zajedničkog rotiranog omotača na tačne X/Y/Z svjetske koordinate, čuvajući unutrašnji raspored i jednu Undo operaciju
- grupna rotacija može koristiti prvi označeni Corpus pivot ili centar zajedničkog rotiranog omotača; oba režima čuvaju Y položaje, međusobni raspored i jednu Undo operaciju
- 3D prikaz označene grupe koristi jedan naglašeni zajednički okvir stvarnog rotiranog X/Y/Z omotača, povezan s prekidačem „Omotači“
- 3D kamera se može jednim klikom fokusirati na aktivni element ili zajednički omotač označene grupe, što olakšava rad u velikim prostorijama i projektima
- prednji, gornji i bočni 2D nacrt prikazuju isprekidani zajednički omotač označene grupe i njegove ukupne horizontalne/vertikalne kote
- Ctrl/Shift+klik na korijenski element u bilo kojoj 2D projekciji mijenja isti grupni izbor kao stablo i 3D prikaz; svaki član grupe je posebno istaknut i prije nastanka zajedničkog omotača
- SVG izvoz nacrta čuva isti grupni omotač i ukupne kote kao interaktivni prikaz, bez dupliranja pojedinačnih kota aktivnog elementa
- poseban 3D režim `Premjesti` za povlačenje korijenskih elemenata po horizontalnoj ravni, sa mrežom 10 mm i jednim Undo korakom po potezu
- trenutna provjera izlaska elementa iz prostorije i prostornog preklapanja dokazivih osnih omotača
- projektna krojna lista koja grupiše ploče po materijalu i izvornim Corpus mjerama, zadržava trag do elementa, broj rupa i skrivene ploče
- krojna lista i potrošni materijal mogu se prebaciti između cijelog projekta i trenutnog grupnog izbora; oba CSV izvoza koriste vidljivi obuhvat i nazivom jasno označavaju grupni izvoz
- ekran prostorije prikazuje odvojene brojeve izlazaka iz sobe i stvarnih zapreminskih preklapanja, sa prebacivanjem između cijelog projekta i označene grupe, punim opisom svakog upozorenja, direktnim otvaranjem problematičnih elemenata u 3D prikazu, automatskim vraćanjem izvan-sobnih elemenata i kontrolisanim SAT razdvajanjem preklopa po X ili Z osi kao jednim Undo korakom; 3D prikaz označava izlazak crvenim, a preklop ljubičastim omotačem
- lokalni Excel-prijateljski CSV izvoz krojne liste u UTF-8 formatu sa tačka-zarez separatorom i decimalnim zarezom
- odvojena proizvodna lista POTITEM zapisa: čuva TIP, deklarisani KOMADA zbir, identifikatore, materijal, broj pojavljivanja i STR0–STR3 primjene bez nagađanja dužine rubne trake
- zaseban lokalni CSV izvoz potrošnog materijala i rubnih obrada
- siguran izvoz izmjena u zaseban `.ivertim-corpus.json` fajl bez prepisivanja izvornog S3D-a
- automatski lokalni oporavak izmijenjene radne kopije u preglednikovoj IndexedDB bazi; početni ekran nudi svjesno vraćanje ili odbacivanje posljednje sesije, bez clouda i bez izmjene izvornog S3D/E3D fajla
- direktno otvaranje i potpuno lokalno strukturno uređivanje samostalnih `.E3D` elemenata (dodavanje, kopiranje, preimenovanje, kontura, rubovi i uklanjanje ploča), te dodavanje jednog E3D elementa u otvoreni S3D projekat
- udvostručavanje bilo kojeg korijenskog elementa; izvorni S3D element se prvo bez gubitka nepoznatih blokova pretvara u lokalni E3D fragment, pa se kopija dodaje kao novi element
- linearni niz do 50 kopija korijenskog elementa sa nezavisnim X/Y/Z razmakom, kao jedna provjerljiva Undo/Redo operacija
- lokalna pretraživa E3D biblioteka: izabere se cijeli `Elmsav` folder, a aplikacija prikaže elemente i njihove podfoldere bez slanja podataka
- lokalna pretraživa CMK biblioteka: izabere se cijeli `Makro` folder, a aplikacija prikazuje sekcije, formule i zavisnosti bez izvršavanja makroa
- bezbjedna CMK simulacija nad izabranim OBJ1/OBJ2 daskama: dokazive vrijednosti RASTER, PILA, POTROSNI, MAKRO i GRUPA operacija računaju se bez izmjene projekta, a nedostajući Corpus runtime kontekst ostaje označen
- kontrolisana primjena potpuno razriješenih RASTER simulacija kao stvarnih rupa na OBJ1 ploči; `GP=0` napreduje po Y, `GP=1` po X za `GR`, dok neriješeni i nedokazani GP režimi ostaju blokirani uz razlog
- read-only RASTER audit nad 2.671 E3D fajlom: 3.958 MSRA sekcija, 51 jedinstven potpis i 0 grešaka dekodiranja; potvrđeni su GP režimi 0/1, dok rijetki GP=2 ostaje neprimijenjen
- opcionalni ručni PMIN/PMAX, DELTA/DELLTA i AUTOST runtime kontekst te izvoz kompletnog CMK simulacijskog dokaza u JSON
- automatski dokazani makro aliasi `SIRINA/VISINA/DUBINA`, `EVAR.*` za razriješene varijable elementa i `OBJ1/OBJ2.SMJER`; `AUTOST` ostaje ručni šestostrani kontekst jer nije svojstvo same ploče
- automatske lokalne granice ploče `OBJ1/OBJ2.MINX/MAXX/MINY/MAXY` iz stvarne konture (ili pravougaonih mjera) i `OBJ1/OBJ2.GR` za debljinu, sa pregledom svih automatskih vrijednosti u simulaciji
- granice dokaza za makro runtime kontekst dokumentovane su u [`docs/macro-runtime-context.md`](docs/macro-runtime-context.md)
- read-only 3D dijagnostika dodira dvije nerotirane ploče razlikuje površinski spoj, razmak, zapreminsko preklapanje i dodir samo ivicom/tačkom te prikazuje lokalnu stranu obje ploče
- svjetski presjek dodira preslikava se odvojeno u lokalnu radnu ravan `OBJ1` i `OBJ2`, sa jasno označenim lokalnim osama; još se ne proglašava automatskim `PMIN/PMAX`
- read-only audit stvarnih S3D/E3D makro-parova: `pnpm audit:joints "PUTANJA_DO_FOLDERA"`
- read-only audit ravni bušenja: `pnpm audit:holes "PUTANJA_DO_FOLDERA"`; dokazni zbir je u [`docs/hole-plane-evidence.md`](docs/hole-plane-evidence.md)
- read-only audit samostalnih i ugrađenih `PILA` operacija, sa lokalnim 2D pregledom potpuno razriješene `GX/GY → PX/PY` linije, dubine, `PSP`, `GS` i sirovih režimskih polja; dokaz i granice su u [`docs/saw-operation-evidence.md`](docs/saw-operation-evidence.md)
- lokalno učitavanje Corpus `elmtex` foldera: tekstualni `MatDat.MXC/K3X` katalozi povezuju ploču sa slikom samo preko jednog tačnog `MATUID`; 3D prikaz koristi lokalnu teksturu, a podaci izabrane ploče prikazuju sliku, kataloški naziv, UID, `TEXX/TEXY/TEXZ` i jasan razlog kada pogodak nije bezbjedan; dokaz i audit su u [`docs/material-library-evidence.md`](docs/material-library-evidence.md)
- parametarski generator osnovnog E3D korpusa sa bokovima, podom, izborom pune gornje ploče ili prednjeg i zadnjeg vezača, ravnomjerno raspoređenim ili ručno visinski postavljenim policama sa nezavisnim prednjim/zadnjim uvlakom te do deset ravnomjerno ili ručno postavljenih unutrašnjih pregrada; police se dijele po stvarnim širinama nastalih polja; podržani su opciono postolje i uvučena cokla, naklopna ili unutar otvora uvučena vrata podijeljena po širini i frontovi ladica podijeljeni po visini, sa jednakim dijelovima ili ručnim omjerima i do deset fronti; poleđina može biti isključena, pločasta unutar korpusa ili tanka HDF poleđina na zadnjoj ravni sa zasebnim materijalom i bojom; vezači koriste dokazani `SMJER=2`, zadani presjek 100 × 18 mm i podesiv zadnji uvlak
- pravljenje opšteg E3D elementa sa jednom početnom pločom, koji se dalje gradi postojećim alatima za dodavanje, kopiranje i uređivanje ploča
- prilagođavanje omotača elementa njegovim direktnim pravougaonim pločama uz očuvan svjetski položaj; rotirane/nepotpune ploče i pod-elementi ostaju eksplicitno nepodržani umjesto nagađanja
- udvostručavanje izabrane ploče u novom ili uvezenom elementu uz očuvanje konture, rupa, obrada i nepoznatih Corpus blokova
- linearni niz do 50 kopija izabrane ploče sa nezavisnim X/Y/Z korakom; svaki puni `AD` fragment zadržava konturu, rupe, rubove i nepoznate obrade, a cijeli niz je jedna Undo operacija
- 2D mreža izabrane ploče sa nezavisnim X/Y/Z koracima kolona i redova, do 50 novih kopija, provjerom preklopljenih ćelija i jednom Undo operacijom; svaki puni `AD` fragment ostaje očuvan
- višestruki izbor ploča jednog elementa i zajedničko lokalno X/Y/Z pomjeranje kao jedna Undo operacija, bez promjene neoznačenih ploča, kontura, rupa, rubova ili obrada
- ravnomjerna raspodjela najmanje tri označene nerotirane ploče po lokalnoj X/Y/Z osi, sa jednakim fizičkim razmakom između njihovih stvarnih osnih mjera, očuvanim krajnjim pločama i jednim Undo korakom
- poravnanje više označenih nerotiranih ploča po fizičkoj početnoj ivici, centru ili završnoj ivici prve označene ploče na lokalnoj X/Y/Z osi, uz uvažavanje različitih Corpus orijentacija i mjera
- grupno kopiranje označenih ploča sa zajedničkim lokalnim X/Y/Z pomakom i grupno uklanjanje uz potvrdu; puni `AD` fragmenti ostaju očuvani pri kopiranju, element uvijek zadržava najmanje jednu ploču, a svaka radnja je jedan Undo korak
- primjena materijala, UID-a, boje, providnosti i vidljivosti aktivne ploče na više označenih ploča te brzo prikazivanje ili sakrivanje označenih ploča, bez promjene geometrije, kontura, rupa ili obrada i kao jedna Undo operacija
- postavljanje zajedničkog fizičkog omotača označenih nerotiranih ploča uz početnu ili završnu granicu odnosno po centru lokalnog omotača elementa na X/Y/Z osi, sa kontrolisanim odmakom, očuvanim međusobnim rasporedom i jednom Undo operacijom
- direktan izbor aktivne ploče klikom u 3D prikazu i zajednički grupni izbor ploča aktivnog elementa pomoću Ctrl/Shift+klika; 3D i tabela koriste isto stanje, aktivna ploča i članovi grupe imaju različito isticanje, a grupne komande su odmah dostupne u podacima
- precizno tastaturno pomjeranje aktivne, pojedinačno označene ili 3D grupe ploča: strelice daju X/Z pomak, `PageUp`/`PageDown` Y pomak, osnovni korak je 10 mm, a uz `Shift` 1 mm; specifičniji izbor ploča ima prednost nad grupom korijenskih elemenata i svaki pritisak je jedna Undo operacija
- `Ctrl+D` kopira označenu grupu ploča sa 100 mm razmaka iza njenog stvarnog X omotača, a `Delete`/`Backspace` uz potvrdu uklanja označene ploče; obje strukturne prečice su fail-closed dostupne samo za samostalne, nove i uvezene E3D elemente, čuvaju pune `AD` fragmente i predstavljaju po jednu Undo operaciju
- kada nema grupnog izbora, `Ctrl+D` i `Delete`/`Backspace` isto daju prednost aktivnoj ploči nad cijelim elementom; kopija se postavlja 100 mm iza stvarnog X omotača ploče, uklanjanje zadržava najmanje jednu ploču, a nepodržani izvor staje bez promjene modela
- ravnomjerna raspodjela izabrane ploče i do 50 njenih kopija između krajnjih X/Y/Z granica elementa, sa jednakim osnim korakom, odmakom od oba kraja i jednom Undo operacijom
- kontrolisano pomjeranje ploče ranije/kasnije u novom ili uvezenom E3D elementu, uz očuvanje cijelog `AD` fragmenta, Undo i upozorenje da redoslijed može promijeniti `OBJ1/OBJ2` makro reference
- uklanjanje izabrane ploče iz novog ili uvezenog elementa uz potvrdu, Undo/Redo i zaštitu posljednje ploče
- opšte dodavanje nove pravougaone ploče u novi ili uvezeni element: naziv, sve tri Corpus orijentacije, položaj, mjere, materijal, boja, vidljivost i providnost; početne vrijednosti nude gotovu policu
- preimenovanje ploče preko izvornog Corpus `DNAME` atributa uz očuvanje konture, rupa i obrada
- vizuelno uređivanje proizvoljne zatvorene konture ravnih segmenata preko Corpus `KRIVULJE` tačaka: 2D pregled sa numerisanim tačkama, X/Z polja, dodavanje, uklanjanje i promjena redoslijeda, pravougaoni i ugaoni-urez predložak, provjera samopresijecanja i automatsko osvježavanje mjera ploče; dokazani lukovi ostaju zaključani
- dodavanje, zamjena i uklanjanje rubne trake na Corpus `STR0`–`STR3` ivicama ploče uz očuvanje svih POTITEM zapisa koji nisu rubna obrada i trenutno osvježavanje proizvodne liste
- izvoz izabranog uvezenog ili generisanog elementa kao samostalni `-IVERTIM.E3D` za ponovnu upotrebu u biblioteci
- radna kopija verzije 10 čuva dodane E3D elemente, izmjene rupa, postojeće `EVAR` vrijednosti, izmjene izraza ploča i punu strukturu samostalnog E3D modela, uz čitanje starijih kopija verzija 1–9
- postojeće `EVAR` vrijednosti mogu se uređivati bez promjene njihovih imena, `VARn` redoslijeda ili nepoznatih XML atributa; izrazi se čuvaju kao tekst i izvoze u S3D/E3D
- novi, samostalni i uvezeni E3D elementi podržavaju i dodavanje, preimenovanje te uklanjanje varijabli; writer obnavlja dokazani neprekinuti `VAR0…VARn` niz, čuva ostale atribute i odbija dvosmislena imena
- EVAR editor prije čuvanja lokalno prikazuje razriješenu vrijednost, nedostajuće reference, ciklične zavisnosti, nepodržanu sintaksu ili drugi nerješiv izraz; poznati geometrijski aliasi elementa ulaze u analizu, a nepoznata Corpus semantika ostaje samo upozorenje
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
pnpm audit:s3d:saw "D:\sobasav"
pnpm audit:e3d "D:\CorpusSolutions\Elmsav"
pnpm audit:cmk "D:\CorpusSolutions\Makro"
pnpm audit:cmk:holes "D:\CorpusSolutions\Elmsav" "Korpusiranje"
pnpm audit:cmk:raster "D:\CorpusSolutions\Elmsav"
pnpm audit:cmk:saw "D:\CorpusSolutions\Makro"
pnpm audit:materials "D:\sobasav" "D:\CorpusSolutions\elmtex"
```

## Granice trenutne rekonstrukcije

- Kroz-bušenja i slijepa bušenja na dokazanim suprotnim glavnim plohama `RPL=0/1` stvarne su šupljine u triangulisanoj geometriji; rijetki `RPL=2` i ostale nedokazane ravni ostaju cilindrični markeri.
- `PTSTYLE=2` koristi kružni luk iz tetive i `PTARRA`; `PTSTYLE=1` ostaje kontrolisana interpolacija dok mu se ne potvrdi izvorna matematika.
- Teksture materijala rade za jednoznačan tačan `MATUID`, ali Corpus UV orijentacija i realna skala/ponavljanje iz `TEXX/TEXY/TEXZ` još nisu dokazani. 3D/izvozna primjena utora, falca i ostalih CNC putanja nije rekonstruisana; PILA linije imaju samo dokazani read-only lokalni pregled.

## Pokretanje na Windowsu

Dvoklik na **`Pokreni-Ivertim-3D.vbs`** u folderu projekta — pokretanje bez CMD prozora. CMD pokretač ostaje dostupan za dijagnostiku.

Loader je 700 × 528 px, sa Ivertim logom i paletom Srednji orah. Ostaje vidljiv najmanje dvije sekunde i čeka da radna površina bude spremna. Postojeća tema radne površine se zadržava.

- Potreban je Node.js 22.12 ili noviji. Prvo pokretanje instalira pakete i traži internet; naredna pokretanja rade lokalno.
- Pokretač sam napravi ili obnovi produkcijski build kada se izvorni fajlovi promijene.
- Program se otvara u zasebnom desktop prozoru. Jedina naslovna traka je plava: desno su sistemska dugmad za smanjivanje, uvećavanje/vraćanje i zatvaranje. Povlačenje plave trake pomjera prozor; dvoklik ga uvećava ili vraća.
- Lokalni server radi na `http://127.0.0.1:4317` samo na ovom računaru. Nije potrebno ručno upisivati adresu. Ponovni dvoklik koristi postojeći server.
- Zatvaranje prozora zatvara prikaz; mali lokalni server ostaje aktivan do gašenja računara. Radnu kopiju sačuvaj dugmetom **Sačuvaj kopiju**, a Corpus fajl preko **Izvezi S3D/E3D**.
- Ako pokretanje ne uspije, CMD ostaje otvoren sa porukom. Dodatni zapis je u lokalnim `corpus-server.log` i `corpus-server-error.log` (ne ulaze u Git).

Glavni radni ekran ima scenu, bočne alatke, stablo projekta i svojstva desno. Mjere i položaj izabranog elementa primjenjuju se iz panela **Svojstva**, uz Undo/Redo. Detaljan editor otvara se dvoklikom u sceni ili dugmetom **Uredi element**. Njegova dalja razrada slijedi nakon posebnog snimka.

Biblioteka se otvara dugmetom **Biblioteka**: pri prvom ulasku izaberi lokalni Elmsav folder. Lijevo su folderi, u sredini fajlovi i pretraga njihovih putanja, a desno 3D pregled i izvorne mjere. Izbor i okretanje pregleda ne mijenjaju projekat; tek **Dodaj u projekat** ubacuje element. Neispravni E3D fajlovi prikazuju grešku i ne mogu se dodati. Dodavanje se može poništiti komandom Undo. Izvorne mjere u pregledu su informativne; uređivanje slijedi nakon dodavanja.

## Corpus radna površina

Pokretanje sada ide kroz loader koji učitava lokalnu istoriju i oporavak, pa prikazuje radnu površinu. Početni prozor ima **Novi projekat**, **Učitaj projekat**, **Odustani** i do deset nedavnih projekata. Nedavni projekti su lokalne kopije posljednjeg učitanog S3D/E3D sadržaja u pregledniku, a ne direktne veze na fajlove na disku. Nesnimljene izmjene imaju odvojeni oporavak sesije.

Gore su padajući meniji i zasebna alatna traka, lijevo dodatne alatke, desno tabovi **Elementi**, **Soba** i **Svojstva**. Tabove možeš mijenjati i strelicama lijevo/desno; mjere u tabu Soba unose se u milimetrima. Detaljan prozor postavki zadržava ranije jedinice u metrima.

Biblioteka, proizvodne liste, postavke, pomoć i postojeći obrasci otvaraju se kao prozori iznad scene. Povuci naslovnu traku da pomjeriš prozor; dvoklik ili dugme □ ga uvećava. Dugme ― ga smanjuje na donju traku, odakle ga možeš vratiti. Prozor možeš razvlačiti za donji desni ugao. Escape zatvara prozor u kojem je fokus. Otvoreni prozori ne zamjenjuju projekat i scena ostaje u pozadini.

Detaljan editor elemenata je zadržan, a njegova dalja razrada je odložena dok se ne potvrdi glavno okruženje prema Corpus snimku.

Meniji podržavaju tastaturu: strelice gore/dolje biraju komandu, lijevo/desno mijenjaju meni, Home/End biraju prvu/posljednju dostupnu komandu, a Escape zatvara meni. Prozori zadržavaju redoslijed preklapanja i ostaju unutar radne površine pri pomjeranju.

## Jezik interfejsa

Osnovni jezik je srpski, latinica i ijekavica. Datumi i brojevi koriste srpski lokalitet. Engleski i drugi jezici biće dodati kasnije prema potrebi; trenutno nema izbora jezika. Izvorni nazivi materijala, elemenata i Corpus polja zadržavaju se pri uvozu.
