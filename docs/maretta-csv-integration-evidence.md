# Maretta CSV — nalazi i sljedeća provjera

Lokalna Maretta instalacija sada je dostupna u `C:/maretta/Wintable`. Raniji nalaz da taj folder ne postoji više ne važi. Pregled je bio samo za čitanje; postojeći poslovi, magacini, postavke i licence nisu mijenjani.

## Šta je potvrđeno

- `CSVIn.dat` sadrži profile `Corpus_01`, `Corpus_02` i `Corpus`, uz opise površinske optimizacije iz 3D Corpusa. Fiksni raspored konfiguracije provjeren je po granicama svih 20 zapisa, ali značenje numeričkih polja još nije dokazano.
- Isporučeni priručnik **Wintable Pro — uputstvo za korišćenje**, verzija 3.29, ima 176 stranica. Stranice 112–114 opisuju CSV uvoz. Stranica 113 je renderovana i vizuelno pregledana.
- Uvoz ima posebne postavke za separator, prvi red sa nazivima polja, mapiranje kolona, tip vrijednosti, jedinice mjera i broj serija. Uputstvo dokazuje mogućnosti dijaloga, a ne trenutne postavke instalacije.
- `Maretta.exp` u Maretta folderu i istoimeni fajl u `CorpusSolutions/export` imaju različite liste `Redosljed`. Zato se njihove numeričke oznake ne smiju smatrati jednakim samo zbog istog naziva fajla.
- Stvarni `DATA/corpus.CSV` na putanji koju navodi Corpus profil nije pronađen. Katalog kant traka `DATABASE/TableKT.csv` nije uzorak izlazne krojne liste.

## Šta još treba dokazati

Kada izvorne aplikacije budu dostupne, pregledati CSV uvozni prozor sa izolovanim sintetičkim uzorkom. Zabilježiti broj ulazne kolone, ciljano polje, separator, zaglavlje, jedinice i postupanje s tekstom. Ne uvoziti probu u postojeći klijentski posao ili magacin. Zatim uporediti stvarni Corpus izlaz i fizičko mapiranje četiri ruba.

Nije dodat CSV izvoz označen kao kompatibilan s Marettom dok ta provjera ne prođe. Sadašnji cilj i dalje uključuje ovu integraciju, spojeve, mapu ploha i korisničku probu.

## Dostupnost aplikacija

Native inventar trenutno ne vidi otvoren Corpus ili Maretta prozor. Jedan pokušaj otvaranja preko vraćenog Maretta inventory ID-ja završio je greškom `ShellExecuteW 2`; nije ponovljen. Korisniku je poslata asinhrona molba da otvori aplikacije i javi kada su dostupne.

REA pregled PE resursa `wintable.exe` nije dao rezultat: prijavio je da raspon resursa nije potpuno poduprt sadržajem jedne PE sekcije. To nije dokaz poslovne logike niti razlog za ponavljanje istog poziva.

## Tačni lokalni dokazi

Detalji ispod su tehnička evidencija granica i hashova. Puni izvještaji ostaju u pomoćnom workspace-u, izvan Gita. Aplikacijski kod u ovom koraku nije mijenjan; posljednja provjera ostaje 340 testova i uspješan build. Bez commita i pusha.


## Novo dostupno stanje

Read-only provjera29.10: C:/maretta/Wintable sada postoji (ranije nije bila dostupna). Native inventar prijavljuje wintable proces, ali nijedan Corpus/Maretta prozor. cua launch_app sa vracenim inventoryID zavrsio ShellExecuteW2; nije ponavljan isti pokusaj niti mijenjana instalacija. Korisniku je poslata asinhrona molba da ih otvori i javi kada su dostupni za kontrolisanu probu.

Corpus profil cilja C:/MARETTA/WINTABLE/DATA/corpus.CSV; taj fajl/direktorijum i dalje nisu pronadjeni. Instalacija ima01_DATA,02_DATAP,DATABASE,WTPInput,HELP,INTERFACE,TEMP. Postojeci klijentski TAB poslovi nisu analizirani i ne ulaze u repo/vault. DATABASE/TableKT.csv je katalog kant traka, ne dokaz Corpus izlazne krojne liste.

## Primarni izvori

- Isporuceni Wintable Pro - uputstvo za koriscenje.pdf:176strana, dokumentverzija3.29/02.02.2014. Str112-114 opisujuCSVimport; str113vizuelno pregledana. Potvrdjeno: opcija prvog reda/zaglavlja, izborseparatora (zarez,tackazarez,tab/drugi), preslikavanje rednogbrojaCSVpolja na ciljnopolje, tipvrednosti,mm/cm/m za duzinu/sirinu, brojserija i izbor/snimanjeprofila. To su mogucnosti uputstva, ne potvrda trenutnihpostavki ove instalacije.
- Screenshotprirucnika113 prikazuje ciljna polja Duzina,Kantovanje duzine1/2,Sirina,Kantovanje sirine1/2,Oznakaelementa,Tekstura,Prioritet,Brojkomada,Siframaterijala,Oznakamaterijala,Barkod1/2,AddInfo. Ne prenijeti redoslijed prikaza u binarnu numericku enumeraciju bez dodatnog dokaza.
- CSVIn.dat194920bajta,SHA256d2c4f194a2561f271365cf75ae8c0fd08345d7496f544b347283ecb2e312256e:20fiksnihzapisa9746bajta/11popunjenihprofila. ProfiliCorpus_01(index7),Corpus_02(8),Corpus(10) izricito opisuju3DCorpus/povrsinskuoptimizaciju. Kandidatni layout: shortstringnaziv0/30bajta,opis30/80bajta;100slotova od116,95bajta,tekst71bajt+24metadatabajta; provjerenegranice svih20zapisa, nijedan stringpredug. Ovo je izvedenstatickilayout, ne dokumentovanABI.
- Corpus_02 iCorpus profili imaju UP([1,LEN]) iCHEXT izraze za .mpr?/.hop?. Znacenje dodatnih24bajta/slota josnije dokazano. Byte71ima malevrijednosti; ne nazivati ga brojemCSVkolone bez provjere. Tail9642sadrzi44,ali to josnije samostalnidokaz aktivnogseparatora.
- CSVOUT_DEF_PovElem.cfg ima kratkestringovenaziveizvoznihpolja na1907+n*500, ukljucujuciduzinu/cetiriruba/sirinu/oznaku/teksturu/kolicinu/materijal/debljinu. To su nazivi izlaznogprofila, ne dokumentacija uvoznogbinarnogID-ja.

## Dva razlicita Maretta.exp

C:/maretta/Wintable/Maretta.exp SHA256a0646516e7d1b7bd5a3e31647ead11d0381b790bdce6494734122c8e79b88a39.
CorpusSolutions/export/Maretta.exp SHA256f7fc1e0e196fc1bde49791b569a4270ff2d4657b673f56cf71f67e70f13408db.
SemantickiINIcompare: razlikuju seRedosljed iSirina; ostalesekcijejednake. Redosljedprvih17pozicija:

| Pozicija0..16 | Maretta isporuceni | CorpusSolutions isporuceni |
|---|---|---|
| ID niz |38,9,15,19,10,23,27,1,13,38,7,5,38,-1,-1,-1,-1|9,10,30,31,32,33,13,7,4,6,0,51,1,50,52,3,47|

Sirina je UIkolonasirina; Redosljed su izvorne numerickeoznake. Razlika se ne smije prepraviti naslijepo: verzija/semantika nisu potvrdjene. Isti nazivfajla nije jednakprofil. Nije dodan lazno oznacen kompatibilan CSVexport.

## Granice i sljedeci konkretan korak

REAinspect_pe_resources nadwintable.exe odbiojePEraspon:Resource range is not entirely file-backed in one section. NemaDFMdekompajlerskogdokaza; nepokretatiGhidruiliistiponovnipozivzbogovoga. Originalnilokalnifajlovi/config/licenca nisu mijenjani.

Kadaje UI dostupan: otvoriti samo CSVuvoznidijalog sa izolovanom sintetickomlistom, odabrati postojeceCorpusprofile i zabiljeziti lijevibroj→ciljnopolje,separator,zaglavlje,jedinice,tekstkodiranje/escape. Ne importovati u postojeci klijentskiposao ili magacin. Zatimuporediti uzorakCorpusexporta i mapuSTR0..3; tek potvrdenprofil ideuaplikaciju. Cetiriruba/godjosnemaju potvrdenufizickumapu.

Helperartefakti: maretta-import-profile-evidence.json, maretta-manual-csv-113.png, lokalniizvucenipdftekstovi. Sirovibinarnifajlovi/prirucnici/licenca/klijentskipodaci nisu kopirani uGit/vault. Posljednjaaplikacijskaprovjera340testova/build; ovajtursamo read-only istraga/dokumentacija. Goalaktivan,bezcommita/pusha.


## Dopuna: otvoreni procesi, nedostupni native prozori

Korisnik je odgovorio „otvoren je“. Nova nezavisna OS provjera na NIKICA-LAPTOP potvrđuje CorpusSolutions i wintable sa naslovima prozora Corpus / Wintable Pro, oba Responding=true. Zato ranija tvrdnja da aplikacije nisu pokrenute više ne važi.

CUA listWindows i novi getState poslije reseta i dalje ne izlažu nijedan njihov prozor (windows=[]), iako ih vide kao pokrenute aplikacije. Postoje druge dostupne aplikacije, pa nije riječ o potpunom prekidu inventara. Pokretanje preko potvrđene apsolutne Maretta putanje takođe je završilo ShellExecuteW2; nije ponavljano. Nije pokušavano upravljanje preko OS handle-a mimo CUA inventara.

Uzrok pristupa još nije dokazan. U izvršnom Corpus fajlu nađen je manifest asInvoker; to nije dokaz da su konkretni procesi pokrenuti bez elevacije, ali ne daje osnov da se problem proglasi licencnim ili memorijskim. Sigurnosne postavke i licence nisu mijenjane. Poslato je jedno dodatno asinhrono pitanje da li je prozor vidljiv na desktopu ili samo na traci, jer je prethodni odgovor potvrdio pokretanje, a ne dostupnost prozora alatu.

Pripremljen je odvojeni kontrolni fajl u pomoćnom workspace-u: IVERTIM-RPL-PROBE-18.E3D,15905bajta. Kopija koristi poznati POLICA.E3D omotač i18novihploča; sourceoriginalnijeizmijenjen. Redovi SMJER0/1/2, koloneRPL0..5, po1rupa/RXP30/RYP40/RFI5/RDU8/RAA0. Ploče120x100x18mm; korak160mm; element1000x500x200. Parser i eksplicitna matrica potvrđuju18ploča/18rupa/svih18parova. Native Corpus učitavanje i fizički prikaz još nisu potvrđeni. Generator prepare-plane-probe.mjs i plane-probe-summary.json čuvaju ponovljivost. Fajl je samo za test, bez makroa i proizvodne upotrebe.

Sljedeće je probu otvoriti u kontrolisanom native prozoru kada postane dostupan. Nema promjene CSV mapiranja na osnovu nedokazanih brojeva. Goal ostaje aktivan.


### 29.10.2026. — podesiv CSV za razmjenu podataka

Zašto: lokalni CSV izvoz je imao samo fiksni separator/decimalni znak/zaglavlje/BOM. Prilagođeni cilj izričito dopušta dokazanu razmjenu podataka nezavisno od još nepotvrđenog Maretta profila. Dodate su postavke u krojnoj listi: tačka-zarez/zarez/tab, decimalni zarez/tačka, zaglavlje i UTF-8 BOM; pregled prva tri reda prati trenutni proizvodni obuhvat. Jedan App state dijele dijalog i glavni Export meni. Postavke traju tokom rada aplikacije; bez novog persistiranog profila. Stari poziv bez opcija daje isti zadani format.

Generator pravilno citira aktivni separator, navodnike i višeredni tekst. Dvije nove regresije pokrivaju decimalni zarez sa separatorom zarez i tab/multiline/navodnike, te nepromijenjen rezultat liste. Puna regresija 342/342 i build uspješni (session8526 exit0; helper csv-options-tests.txt/csv-options-build.txt). React pregled: bez uslovnih hookova, ograničen pregled na tri grupe, kontrolisani label/input/select i dijeljeno stanje bez efekata.

Browser: stvarni PLAFON_PLATA (1).E3D → krojna → zarez/decimalna tačka/bez zaglavlja i BOM-a → stvarni download. Nezavisni Python csv.reader potvrđuje tri reda, devet kolona, ukupno pet ploča, bez BOM-a. Export meni daje identične bajtove kao dugme dijaloga; zatvaranje/ponovno otvaranje čuva izabrane postavke. Browser warn/error prazan. Screenshot helper csv-options-proof.jpg. Nije izveden uvoz u Marettu niti potvrđeno fizičko mapiranje rubova; UI to jasno razlikuje. Bez commita/pusha, goal aktivan.
