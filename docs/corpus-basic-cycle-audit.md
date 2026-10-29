# Osnovni Corpus ciklus — audit 28.10.2026.

Ovo je provjera izvornog obuhvata iz [workflow mape](corpus-workflow-map.md), ne nova definicija završetka. Istorijski prazni checkboxovi nisu dokaz da kasniji rad ne postoji; ni prolaz testova nije dokaz pune jednakosti Corpusu. Izvorni snimci ostaju u ignorisanom recordings/ folderu. Posljednja puna regresija: 367 testova; kasniji JSX obuhvat i lokalni CSS potvrđeni su browser probom opisanoj ispod.

| Zahtjev | Trenutni dokaz | Ocjena / šta još nedostaje |
|---|---|---|
| Osnovni tabovi i kontekstualna traka | src/app.tsx ElementDetails i src/desktop.tsx; editor-progress početni UI checkpoint i kasnije probe | Djelimično: osnovni tabovi postoje; Kotiranje je sada vidljiv onemogućen tab sa objašnjenjem, ali njegova funkcija nije implementirana; prisustvo svih aktivnih komandi nije pojedinačno auditirano. Dobavljački dodaci van ciklusa. |
| Canvas, podesivi desni/donji panel | ElementEditorWorkbench; browser snimci formula i kataloga, progress24/28.10 | Podržano za probane desktop širine; nije dokaz svih rezolucija. |
| Sinhronizovan izbor i lokalno skrivanje fronti | Browser D1V PLAFON/FRD; viewport hideFronts odvojen od model visible; visibility testovi | Podržano u probanim tokovima; naslijeđena vidljivost i proizvodni obuhvat odvojeno testirani. |
| Prihvati/Odustani i granica sesije | openDocument/finishElementEditor; begin/acceptCorpusEditorSession; model testovi i UI Y150/Odustani, prihvatanje polica | Podržano: sesija se grupiše u jednu sobnu radnju; nije globalna grupna primjena na sve slične elemente. |
| Broj/izraz/rezultat bez tihog gubitka | corpus-board-formulas i parametric; browser PLAFON/FRD; invalid-domain i ciklus testovi | Podržano za implementirani jezik; CLR/EVAR/DE i druge nepoznate formule ostaju izvorne, uz upozorenje. |
| lijevi_bok.debljina i Undo/Redo | Stvarni D1V PLAFON browser/editor/download/reload, log board-formula-editor | Potvrđen traženi primjer; nije dokaz pune proizvodne rekalkulacije obrada. |
| Varijable i zavisnosti | Zajednički graf, tačna ELM putanja i draft; real WC_CORNER_45_L Sides_W620; glavni FR roditeljski1,5 | Podržan poznati opseg i dodavanje/brisanje sa upisom; import/reset skupa nije potvrđen izvornim formatom. EVAR semantika otvorena. |
| Kružna/nepoznata referenca | inspectCorpusGeometryIssues i transitive missingReferences; tests/corpus-parametric.test.ts; browser7EVAR izvještaj | Potvrđena jasna poruka i očuvana geometrija za probane slučajeve. |
| Police/pregrade i naknadni resize | corpus-panel-array, DF fit guard, stvarni D1V resize/export; ručni i jednaki razmaci | Podržano za pravougaoni dokazani otvor; fiksnost/tehnologija i automatski spojevi nisu implementirani. |
| Materijal i četiri rubne strane | Material replacement stvarni roundtrip; BoardEdgeBandingEditor i POTITEM STR0..3 writer test | Djelimično: čuva i upisuje sirove strane, ali njihovo fizičko mapiranje po orijentaciji nije dokazano. Ne označavati prednja/zadnja ili CSV rubove nagađanjem. |
| Jedan spoj i makro kroz sve relevantne orijentacije | macro-runtime-context.md; statički/dinamički OB2 audit; dijagnostika presjeka | Nije završeno: AUTOST0/1, PMIN/PMAX i izbor susjeda nemaju opšti proizvodni dokaz. Potrebna kontrolisana originalna proba ili konkretan dokaz iz runtime koda. |
| Obuhvat grupne primjene sa jednim Undo | corpusAppliedBoardAppearance i model history; src/app.tsx grupa ploča | Djelimično: nova inline lista ciljeva i opis prenosa materijala/boje/providnosti/vidljivosti; browser proba dvije označene/jedne neoznačene i Undo potvrđena. Grupna postojeća varijabla sada ima pregled dva označena/jednog neoznačenog E3D cilja, jedan Undo, stvarni izvoz i reload. Prenos cijele izmijenjene konstrukcije na više elemenata ostaje odvojen. |
| Biblioteka → editor → prihvati → soba → E3D → reload | Stvarni D1V logovi i POLICA1200x18x600 puni tok | Potvrđeno na tim uzorcima; D1V bibliotečki resize i dalje blokiran4CLR. |
| Očuvanje mjera/formula/materijala/kantova/obrada/nepoznatih zapisa | E3D writer testovi; D1V duboki roundtrip; PLAFON_PLATA stvarni download deep compare osim room position | Potvrđeno očuvanje izvornih zapisa u probanim tokovima. Očuvati obradu nije isto što i ispravno regenerisati proizvodnu obradu nakon konstrukcijske promjene. |
| CSV prema stvarnom optimizatoru | Snimak prikazuje Maretta kolone; postojeći CSV izvoz | Nije završeno: potreban stvarni izlazni uzorak/profil za redoslijed, separator, kodiranje, jedinice i rubove. |
| Korisnička proba i ciljna pojednostavljenja | Korisnikov zahtjev da agent nastavi samostalno | Nije izvedeno; bez korisničke potvrde ciklus nije završen. |

## Redoslijed narednog rada

1. Grupni izgled potvrđen28.10: dvije označene/jedna neoznačena, materijal/boja/providnost/vidljivost, jedan Undo. Nastaviti razlikovati ovaj obuhvat od masovne konstrukcijske primjene na više elemenata.
2. Dovršiti lokalni bibliotečki roundtrip tamo gdje nije kompletan browser reload; ne širiti tvrdnju na neriješene modele.
3. Istražiti EVAR/CLR i spoj/AUTOST iz primarnih dokaza. Native Corpus je ranije bio minimizovan i alat nije mogao aktivirati prozor; REA Ghidra bridge nije dao kod. Ne ponavljati iste neuspjele pokušaje bez promjene uslova.
4. Za CSV i korisničku probu sačuvati tačne nedostajuće ulaze; ne izmišljati format niti zatvarati cilj na osnovu broja testova.

Zašto: kumulativni progress sadrži i istorijske opise koji su kasnijim radom nadograđeni. Ova matrica odvaja potvrđenu implementaciju, ograničen dokaz i stvarne preostale zahtjeve, čuvajući puni originalni cilj. Goal ostaje aktivan. Bez commita/pusha.


## Browser potvrda proizvodnog obuhvata

Stvarna obnovljena prostorija NOVI-IVERTIM-PROJEKAT.S3D sa PLAFON_PLATA1500x36x650 i WC_CORNER_45_L: cijeli projekat20 ploca/13 grupa/7 nerijesenih izraza. Otvaranje dijagnostike pokazuje izvorne izraze i EVAR.CUT_FOR_RAIL, EVAR.FRONT_GAP_L_R, EVAR.FRONT_GAP_UP_DO, ukljucujuci tranzitivnu zavisnost rail sirina. Samo oznaceni PLAFON_PLATA:5 ploca/3 grupe, bez dijagnostike i bez potrosnih stavki.

Sakrivanje WC_CORNER_45_L i izbor Cijeli projekat:5 ploca/3 grupe,28 skrivenih ploca i nula upozorenja. Zatvaranje liste, jedan glavni Ponisti i ponovno otvaranje vraca vidljivi WC,20 ploca/13 grupa i7 upozorenja; Undo ponovo disabled/Redo enabled. Ovo potvrdjuje da dijagnostika prati isti vidljivi/grupni obuhvat i Undo. Ne potvrdjuje Maretta format niti regenerisanje obrada.

Novi IABtab4 ostao stabilan nakon Vrati sesiju i ucitavanja3D; ograniceni warn/error log prazan. Ranije kratko vracanje na startup nije ponovljeno i uzrok nije dokazan, pa nema popravke napamet. Screenshot helper production-scope-proof.jpg, vizuelno pregledan1280x720; sadrzaj upozorenja citljiv i skrolabilan. Tab oznacen handoff. Vite session45867 ziva. Nema promjene aplikacijskog koda ni dodatnog builda: posljednja regresija330testova/build.


## E3D rupe - RAA i ocuvanje izvornog konteksta

Stvarni D1V.E3D ima GRUPA14 RAA/RZA/RTLTR/RCR atribute i RVAR u RUPE. Otkriveno da parser cita ugaoRAA, a writer pogresno piseRAL; prethodni test novog bušenja nije provjeravao ponovno procitani ugao. Writer sada za nove rupe piseRAA. Izmjena postojece rupe mijenja samo promijenjene osnovne atribute u izvornom cvoru; nepoznati atributi, djeca i nepromijenjeni RAS ostaju izvorni.

Parser dodaje opcioni sourceIndex unutar GRUPAtipa, koji draft/model/kopije i radna kopija cuvaju radi vezivanja na originalni XMLcvor. Validacija radne kopije provjerava da je indeks nenegativan cijeli broj. Nove rupe bez porijekla se serijalizuju kao nove. RUPE writer vise ne zamjenjuje cijeli kontejner: cuva atribute kontejnera, komentare, RVAR i nepoznatu djecu na njihovim izvornim mjestima. Kopije originala ostaju uz svoj izvorni cvor; redoslijed preko razlicitih izvornih RVAR konteksta nije automatski dozvoljen. Izmjena RASsadrzaja postojecih rupa bez dokazane mape se eksplicitno odbija; rucni editor ionako prenosi postojece RASpodatke nepromijenjene.

Provjere: puna regresija335testova/build(exec99953 exit0), zatim dodatna provjera prenosa sourceIndex i kopije prije interleavedRVAR:38ciljanih testova prolazi (ukupan skup sada336testova, posljednja puna regresija bila335). Stvarni D1V test mijenja naziv/ugao jedne postojece rupe; izlaz je tacno izvorni XML sa samoRNA/RAA izmjenom, a ponovno procitani cijeli model jednak ocekivanom. Sinteticki roundtrip svih6ploha cuva izraze, uglove0..75 iRPL; kopiranje/brisanje cuva RVAR/RAS/nepoznate atribute/djecu. Ovo je dokaz ocuvanja zapisa, ne fizickog smjera svih6ploha ili regenerisanja makroa.

Otvoreno: stare sacuvane radne kopije rupa bez sourceIndex nemaju pouzdan identitet izvornog cvora; ne tvrditi da je migracija takvih izmjena vec dokazana. Za nove i trenutno procitane elemente porijeklo se cuva. Browser roundtrip jos nije izveden za ovu zadnju writerizmjenu; prethodni browser potvrduje rucniunos/Undo. Tab4 i Vite45867 su ranije ostavljeni za nastavak, trenutno stanje ponovo provjeriti. Bez commita/pusha; goal aktivan.


## Stare radne kopije i stvarni browser E3D krug

### Zasto
Novi sourceIndex metapodatak ne smije uciniti stare radne kopije necitljivim niti njihove izmjene ponovo serijalizovati bez dodatnih podataka. Prakticni nastavak otkrio je i stvarni problem dodavanja prve rupe na plocu bez izvorne RUPE sekcije, sto prethodni testovi sa RUPEpraznimkontejnerom nisu pokrivali.

### Izmjene
- Primjena radne kopije poredi proizvodna polja bez opcionog sourceIndex, uz provjeru postojecih indeksa. Za staru kopiju porijeklo se vraca iz identicnog zapisa, jedinstvenog naziva istogGRUPAtipa ili istih svihpoljaosimnaziva. Dodavanje se razlikuje od izmjene samo kada su svi izvorni zapisi vec povezani. Dvosmislene kombinovane izmjene ne nagadjaju porijeklo: jasna poruka, projekat netaknut. Stari sidecar nije prepisan. Nove kopije i dalje cuvaju sourceIndex.
- Writer odbija nepostojeci sourceIndex umjesto tihog gubitka izvornog cvora.
- Prva rupa sada dodaje RUPE i kadaAD nema sekciju, ukljucujuci samozatvarajuciAD. Izvorni atributi i nepoznata djeca ploce ostaju sacuvani.

### Provjera
340testova i build prolaze, exec53025 exit0; helper legacy-hole-tests.txt/legacy-hole-build.txt. Nove probe obuhvataju starikopija→restore→XMLsacustompodacima, preimenovanje/mjeru/novuunos, odbijanje dvosmislenosti i dvaADoblika bezRUPE.
Browser stvarni PLAFON_PLATA1500x36x650/BOK ZA PLATU: dodana rupa RXP=B/2,RYP=L/2,RPL5,RAA45,RFI5,RDU5; Prihvati; izvoz prvo dao jasnuRUPEmissinggresku(nije downloadtooluspjeh). Poslije popravke preuzeto C:/Users/Korisnik/Downloads/Elmsav-_OSTALO-PLAFON_PLATA-IVERTIM (1).E3D,8653bajta. Nezavisni PythonXMLpregled potvrduje ta polja. Fajl ucitan kroz pravi chooser u novom IABtab5; editor prikazuje svih7istihvrijednosti i1rupu. Screenshot helper hole-export-reload.jpg. Originali nisu prepisani.
Tab4ostajeizvorna testnasoba sa prihvacenomrupom; tab5standalonepreuzetifajl/editor, oba handoff. Nije puna proizvodna provjera svih6ploha/CONNECT/spojeva ili MarettaCSV; ti zahtjevi ostaju otvoreni. Goalaktivan; bezcommita/pusha.


### 29.10.2026. — minimalna širina panela bušenja i native blokada

Zašto: fiksne širine polja i tri/četiri kolone preklapale su obrasce serije, mreže i ogledanja u uskom editoru. Lokalni CSS sada koristi dvije prilagodljive kolone i dugmad preko cijelog reda. Browser proba na minimalnih 230 px: sva tri obrasca imaju clientWidth=scrollWidth=176 px, svi inputi/selecti/dugmad unutar granica; bez warn/error poruka. Snimak: helper hole-sidebar-proof.jpg. Build (33005) exit 0; posljednja funkcionalna regresija ostaje 340 testova, bez novih funkcionalnih izmjena u ovom koraku.

Korisnik je potvrdio da je Corpus vidljiv na desktopu. Dokumentovana aktivacija inventarisanog prozora nije omogućila snimak: alat ga i dalje prijavljuje minimizovanim ili ga izostavlja. Ovo je blokada pristupa alata, nije zahtjev korisniku da ponovo otvara aplikaciju. Ne ponavljati isti pokušaj bez nove promjene stanja. Kontrolni IVERTIM-RPL-PROBE-18.E3D učitan je u Ivertim: 18 imenovanih ploča i 18 rupa, svih SMJER 0..2 / RPL 0..5 kombinacija; browser stablo i prikaz potvrđeni, native poređenje nije izvedeno. Nisu pojedinačno provjerena sva polja svih 18 ploča kroz UI.

MakroHlp GSI1 parovi (0,1), (2,3), (4,5) pripadaju POTROSNIX/FS1 kontekstu 3D okova. To nije dokaz mapiranja RPL rupa; oppositeCorpusHoleFace ostaje bez proširenja. Pretraga dostupnih pluginova za Corpus/Maretta nije našla konektor. Ostaju otvoreni fizičko mapiranje ploha i rubova, proizvodni spoj, stvarni CSV uvoz i korisnička proba. Bez commita/pusha.


### 29.10.2026. — svih 18 kontrolnih kombinacija kroz UI

Naknadna browser provjera otvorenog IVERTIM-RPL-PROBE-18.E3D sada je pojedinačno prošla svih 18 ploča (SMJER 0..2 × RPL 0..5). Za svaku je kroz vidljivi panel Bušenje potvrđen naziv PROBE_RPL_n, X=30, Y=40, prečnik=5, dubina=8, ravan=n, ugao=0. Read-only DOM čitanje odmah poslije klika ponekad prethodi React osvježavanju; ponovljeno nakon provjere sadržaja panela svih 18/18 ima tačne vrijednosti. Nije potvrđena trajna zamjena podataka niti je zbog tog kašnjenja mijenjan kod. Rezultat helper plane-matrix-ui-values.json. Ovo dokazuje izbor i prikaz sačuvanih parametara u Ivertimu, ne fizičku mapu Corpus ploha.

Ponovo pregledani oba vodiča snimaka, workflow kriterijumi, CSV i macro runtime dokazi. Preostali proizvodni zahtjevi ostaju otvoreni: native mapiranje ploha/rubova, spoj sa dinamičkim susjedom, stvarni CSV tok i korisnička proba. Raniji native pristup i Ghidra timeout ne predstavljaju dokaz tih semantika. Bez novih aplikacijskih izmjena i bez commita/pusha.


### 29.10.2026. — cilj blokiran nakon ponovljene provjere pristupa

Posljednja provjera: CUA listWindows ponovo vraća Corpus prozor 789636, ali getApp za taj tačan inventarisani ID ponovo odbija očitavanje kao minimizovan. Korisnik je već potvrdio da je vidljiv; prethodna dokumentovana aktivacija nije pomogla. Ista prepreka se ponavlja kroz najmanje tri uzastopna goal koraka. Ghidra pokušaj je ranije terminalno završen provider timeoutom; nema živog procesa koji se čeka. Dokumentacija, lokalni uzorci i kontrolna Ivertim matrica ne dokazuju preostalu proizvodnu semantiku.

Cilj se označava blocked, ne complete. Nastavak zahtijeva funkcionalan pristup izvornom Corpus/Maretta prozoru ili konkretne kontrolisane prije/poslije E3D i CSV dokaze. Ostaju fizičke plohe/rubovi, dinamički spoj, stvarni CSV uvoz i korisnička proba. Dosadašnji kod i radna stabla ostaju sačuvani, bez commita/pusha. Zašto: spriječiti ponavljanje istog neuspjelog pristupa i uvođenje nagađane proizvodne logike.


### 29.10.2026. — ponovna proba nakon promjene ekrana

Korisnik je uklonio/promijenio dodatni ekran i zatim postavio Corpus u prvi plan (poruka sad). Prvi novi listWindows nije vratio Corpus; listApps potvrđuje CorpusSolutions isRunning=true bez prozora. Jedan launch_app sa tačnim vraćenim inventory ID-jem nije izložio prozor za upravljanje. Nakon korisnikovog sad i u narednom goal koraku listWindows ponovo izostavlja Corpus. To su tri uzastopna koraka poslije ponovnog pokretanja cilja sa istom blokadom pristupa. Nema novog dokaza fizičkih ploha, spojeva ili CSV mapiranja. Cilj ponovo blocked, ne complete; kod netaknut, bez commita/pusha. Potreban funkcionalan native pristup ili kontrolisani E3D/CSV izlazni uzorci. Ne tražiti ponovo isti klik u traci zadataka.


### 29.10.2026. — korisnik odobrio prilagođen aktivni cilj

Korisnik: aktiviraj goal i prilagodi nastavak bez prave provjere u Corpusu. Novi prilagođeni cilj uspješno vraćen kao active. Živa Corpus proba više nije preduslov za nezavisne dorade osnovnog toka. Rad se dokazuje snimcima, lokalnim fajlovima, testovima/buildom i browser tokom u Ivertimu. Ne nagađati fizičke plohe/rubove, dinamičke spojeve ni Maretta profil; njih voditi kao zasebne otvorene vanjske provjere. Nastaviti raspored/svojstva/varijable, biblioteku/postavljanje, vidljivost/proizvodni obuhvat, editor/Undo/E3D. Bez novih dizajna, ručkica ili ugrađenog optimizatora. Bez commita/pusha. Zašto: korisnik želi dalji samostalni napredak uprkos nedostupnom native prozoru; raniji blocked zapis je istorijski, ne aktuelni status.


### 29.10.2026. — browser provjera prečica i Odustani za obradu

Zašto: prilagođeni cilj traži nastavak lokalno dokazivog osnovnog toka, posebno pouzdan Undo/Redo i granicu sesije. Provjeren stvarni UI kontrolnog E3D učitanog kroz Nedavne projekte. Na PROBE_SMJER_0_RPL_0 izmijenjeni X rupe 30 → B/2 i dubina 8 → 9, jednim Sačuvaj rupu. Ctrl+Z sa fokusom u stablu vraća zajedno X=30/dubina=8; Ctrl+Shift+Z ponavlja B/2/9. Ctrl+Z sa fokusom u tekstualnom polju ne pomjera istoriju modela (Undo ostaje aktivan, Redo neaktivan). Time se ne tvrdi broj koraka nativne tekstualne istorije browsera.

Odustani zatvara sesiju; ponovni ulazak u editor i izbor iste ploče vraćaju svih sedam osnovnih polja PROBE_RPL_0,30,40,5,8,0,0 i onemogućen Undo. Nije preostala probna promjena u modelu. Browser warn/error prazan; helper editor-history-session-proof.jpg. Nije bilo aplikacijskih izmjena, pa nisu ponavljani testovi/build; posljednja puna regresija ostaje 340 testova. Ovo dopunjava dokaz B-01/granice sesije u obradi, ne potvrđuje proizvodno regenerisanje makroa. Goal aktivan; bez commita/pusha.


### 29.10.2026. — podesiv CSV za razmjenu podataka

Zašto: lokalni CSV izvoz je imao samo fiksni separator/decimalni znak/zaglavlje/BOM. Prilagođeni cilj izričito dopušta dokazanu razmjenu podataka nezavisno od još nepotvrđenog Maretta profila. Dodate su postavke u krojnoj listi: tačka-zarez/zarez/tab, decimalni zarez/tačka, zaglavlje i UTF-8 BOM; pregled prva tri reda prati trenutni proizvodni obuhvat. Jedan App state dijele dijalog i glavni Export meni. Postavke traju tokom rada aplikacije; bez novog persistiranog profila. Stari poziv bez opcija daje isti zadani format.

Generator pravilno citira aktivni separator, navodnike i višeredni tekst. Dvije nove regresije pokrivaju decimalni zarez sa separatorom zarez i tab/multiline/navodnike, te nepromijenjen rezultat liste. Puna regresija 342/342 i build uspješni (session8526 exit0; helper csv-options-tests.txt/csv-options-build.txt). React pregled: bez uslovnih hookova, ograničen pregled na tri grupe, kontrolisani label/input/select i dijeljeno stanje bez efekata.

Browser: stvarni PLAFON_PLATA (1).E3D → krojna → zarez/decimalna tačka/bez zaglavlja i BOM-a → stvarni download. Nezavisni Python csv.reader potvrđuje tri reda, devet kolona, ukupno pet ploča, bez BOM-a. Export meni daje identične bajtove kao dugme dijaloga; zatvaranje/ponovno otvaranje čuva izabrane postavke. Browser warn/error prazan. Screenshot helper csv-options-proof.jpg. Nije izveden uvoz u Marettu niti potvrđeno fizičko mapiranje rubova; UI to jasno razlikuje. Bez commita/pusha, goal aktivan.


### 29.10.2026. — potvrda strukture varijabli i povezani ciklus

Zašto: tokom pune browser probe nova varijabla TEST_POMAK bila je pripremljena, a upis njene vrijednosti odmah je neprimjetno potvrdio i dodavanje/naziv, suprotno poruci da se struktura potvrđuje čuvanjem. VariableEditor.changeValue sada ažurira model uživo samo ako nazivi i broj odgovaraju aktuelnom izvornom skupu. Dodavanje, preimenovanje ili uklanjanje ostaje draft sa porukom i aktivnim Sačuvaj; vrijednosti tog drafta se potvrđuju zajedno. corpus-variable-draft.ts i dvije regresije pokrivaju dodavanje/brisanje/preimenovanje, promjenu veličine slova i novu osnovu nakon save/undo. Puna regresija 344/344 i build exit0 (session93501, helper variable-draft-tests.txt/build.txt).

Povezana UI proba: Novi projekat → lokalna biblioteka POLICA Elmsav/Wardrobe/Accessories → mjere prije umetanja 1000×18×550 → soba → editor → dodaj TEST_POMAK=25 → Sačuvaj varijable → ploča VEZNA_POLICA1 XF=TEST_POMAK → rezultat25mm → Prihvati. Jedan sobni Undo uklanja TEST_POMAK, Redo vraća25. Izvezen Downloads/Elmsav-Wardrobe-Accessories-POLICA-IVERTIM (1).E3D; nezavisni XML pregled potvrđuje VAR23=TEST_POMAK=25, XF=TEST_POMAK, DXPOS=25, VISINA=1000/DUBINA=550/DEBLJINA=18. Nova browser sesija tab7 upload baš tog download-a potvrđuje istu varijablu, izraz, rezultat i mjere.

Proizvodni obuhvat u sobi: sakrivanje police daje0ploča/1izostavljenu i onemogućenCSV; jedan Undo vraća1ploču/0izostavljenih, krojna1000×550×18 i izvorniPOTITEM ABS1mm STR0..3=0/0/1/0. Preuzet NOVI-IVERTIM-PROJEKAT-KROJNA-LISTA.csv. Ovo nije potvrda fizičke rubne mape.

Poslije popravke UI dodavanje25 ostavlja Save aktivan i Undo neaktivan, bez nove varijable u modelu do čuvanja. Preimenovanje TEST_OFFSET i vrijednost30 ostavljaju rezultat25 i Undo neaktivan; Odustani vraća TEST_POMAK25. Brisanje TEST_POMAK pa unos MODUL2 ostavlja model MODUL1/TEST_POMAK25, Save aktivan/Undo neaktivan. Postojeća vrijednost TEST_POMAK25→30 bez strukturnog drafta odmah daje30mm; Undo vraća25mm. Browser warn/error prazan. Screenshot helper variable-draft-cycle-proof.jpg; tab6 soba/krojna, tab7 ponovo učitani element/editor, handoff.

Nisu mijenjani originalni Corpus fajlovi. Ne tvrditi proizvodno regenerisanje makroa ili podršku svih formula: izvorni šablon ima stare roditeljske varijable koje nisu razriješene van svog korpusa. Ova proba dokazuje korišćenu vezu TEST_POMAK i dati tok. React pregled: bez novih hookova, zajednički gate za tekst i select vrijednosti, postojeći Save validator ostaje; nedozvoljena struktura više ne prolazi kroz live unos. Bez commita/pusha; prilagođeni cilj aktivan.


### 29.10.2026. — priprema grupne primjene varijable (UI još otvoren)

Zašto: grupna primjena konstrukcijskih vrijednosti iz workflow kriterijuma nije riješena grupnim izgledom ploča. Dodan lib/corpus-group-variables.ts sa prepareCorpusGroupVariableChange: izričite različite korijenske mete, svaka sa trenutnim elementom i vlastitim E3D izvorom; postojeća jednoznačna varijabla, dozvoljeno modeliranje, razriješen novi izraz; svaki izvor zasebno prepisuje postojeću radnu geometriju, čuva varijable, preračunava i parsira. Svi rezultati se vraćaju tek po uspješnoj pripremi cijele grupe; ulazi se ne mijenjaju. Greška na posljednjoj meti ne može djelimično promijeniti projekat.

Tri ciljane regresije potvrđuju dvije različite mete (OFFSET/offset), vlastite položaje i omotače, izraz30+5→35, rupe i nepoznati XML, netaknutu neoznačenu treću; odbijanje zaključane/nedostajuće/nepoznatog izraza/duplihmeta; negativnu dimenziju tek na drugoj meti uz netaknute sve ulaze. Prvi testni fixture je dopunjen izostavljenim uglovima koje writer već zahtijeva; produkciona provjera nije oslabljena. Puna regresija347testova i typecheck exit0; helper group-variable-core-tests/typecheck.txt. Nema nove UI funkcije još, nije potvrđen grupni Undo ili browser tok; ne proglašavati grupnu primjenu dovršenom.

Sljedeći korak: povezati helper na sobnu označenu grupu u App, samo E3D izvori (rootIndex-originalCount → importedE3dSources). Prije primjene prikazati tačne nazive/šifre i stare→nove vrijednosti za sve označene; varijabla mora biti prisutna u svakoj meti. Pripremiti sve rezultate prije jednog setProject sa appendProjectHistory, ažurirati i inspection.elements i importedE3dSources, zadržati neoznačene. Jedan Undo mora vratiti cijelu grupu i sve izvore. Blokirati tokom editorSession i jasno označiti originalni S3D bez izdvojenog E3D izvora. Zatim browser dvije označene/jedna neoznačena, različite širine/pozicije, izvoz/reload i negativna proba. Nema automatskog prenosa cijele konstrukcije ili proizvodnih makroa. Goal aktivan, bez commita/pusha.


### 29.10.2026. — grupna varijabla: pregled, jedan Undo i stvarni izvoz

Povezan prepareCorpusGroupVariableChange sa sobnim označenim korijenskim E3D elementima. Novi GroupVariableEditor prikazuje zajedničke nazive, novu vrijednost/izraz, tačne ciljeve sa rednim brojem/nazivom/šifrom i starom→novom vrijednošću. Proširivi detalji pokazuju promjene položaja, mjera, uglova i vidljivosti elemenata/ploča/potomaka. Pregled ne mijenja model. Potvrda ažurira i inspection.elements i odgovarajuće importedE3dSources, u jednom history koraku. Neoznačeni ostaju isti. Izvorni S3D bez vlastitog E3D izvora i aktivna sesija editora nisu podržani u ovom alatu. Zastarjeli pregled se odbija po referencama izvora/elemenata i označenom skupu.

Browser tab6: VEZNA_POLICA, kopija GRUPA_B sa omotačem širine900, kopija GRUPA_C sa širinom1000; položajiX4036/5036/6036. Označene samo prve dvije. Pregled TEST_POMAK25→40 prikazuje oba cilja i lokalni položaj ploče25→40. Primjena daje40/40/25. Jedan Undo daje25/25/25, Redo40/40/25. Stvarni E3D download tri elementa nakon primjene i prva dva poslijeUndo: nezavisni Python XML parser potvrđuje VAR, XF, DXPOS, očuvane omotače1000/900/1000 i položaje. Helper group-variable-ui-proof.json i group-variable-xml-proof.json; preuzeti POLICA-IVERTIM (2)..(6).E3D. Čista sesija tab8 upload (3).E3D potvrđuje GRUPA_B/TEST_POMAK40/širina900/XFTEST_POMAK/rezultat40mm.

Negativne UI probe: MISSING+1 odbijen bez dugmeta Primijeni; pripremljeni45 pa naknadna promjena položaja neoznačenog C čine pregled zastarjelim, potvrda odbijena. Undo vraća samo tu probnu promjenu položaja. Pomoćni pregled40→50 snimljen u group-variable-preview.jpg, zatim poništen pražnjenjem polja; model ostaje40/40/25. Nije primijenjena50. Browser warn/error prazan. Tab6 zadržan za nastavak, tab8 ponovo učitani B/editor.

Puna regresija347/347 i build session10497exit0; poslije dodavanja pregleda uglova korijena završni build23007exit0, git diff --check bez grešaka. React pregled: kontrolisana polja i bez uslovnih hookova, plan se čisti pri promjeni unosa, komponenta resetuje pri promjeni označenog skupa, App provjerava zastarjelost prije upisa, ograničen obuhvat na postojeću varijablu. Ovo nije prenos cijele konstrukcije na sve istoimene elemente niti potvrda fizičkog proizvodnog spoja/makroa. Bez commita/pusha, cilj aktivan.


### 29.10.2026. — čuvanje i obnova grupne promjene

Zašto: poslije grupne primjene treba dokazati trajnost cijelog projekta, ne samo pojedinačni E3D izvoz. Nova integraciona regresija u corpus-group-variables.test.ts priprema dva cilja i neoznačeni treći, prolazi stvarne E3D izvore kroz createCorpusWorkingCopyFile → JSON stringify/parse → recovery snapshot → applyCorpusWorkingCopyProject, pa duboko poredi sva tri elementa i izvore, vrijednosti40/40/25, položajeploča40/40/25 i originalElement identitete. Puna regresija348/348 i typecheck exit0 (session62202). Aplikacijski kod nije mijenjan, posljednji završni build23007 ostaje važeći.

Browser tab6 → stvarno dugme Sačuvaj radnu kopiju → Downloads/NOVI-IVERTIM-PROJEKAT.ivertim-corpus.json. Nezavisni Python parser potvrđuje verziju9, tri uvezena E3D XML-a, VAR TEST_POMAK40/40/25, XFTEST_POMAK, lokalniX40/40/25, širine1000/900/1000, položaje korijena4036/5036/6036. Nova čista sesija tab9 → početni Vrati sesiju → isti tri naziva, vrijednosti, širine i položaji kroz UI. Obnovljeni GRUPA_B izvezen kao POLICA-IVERTIM (7).E3D; XML stablo identično pre-obnovnom (3).E3D. Helper group-recovery-ui-proof.json, verify-group-recovery-copy.py, group-recovery-proof.jpg. Browser warn/error prazan, tab9 zadržan za nastavak. Grupni izbor/Undo istorija nisu tvrdnjom uključeni u format oporavka; dokazano stanje modela i izvori.

Prilagođeni cilj ostaje aktivan: praktični lokalni tok je potvrđen, ali audit svih lokalno izvedivih osnovnih komandi i preostalih ograničenja još nije zatvoren. Ne zaključivati punu jednakost Corpusu. Fizičke mape, dinamički spoj i Maretta profil ostaju vanjske provjere po korisnikovoj odluci. Bez commita/pusha.


### 29.10.2026. — Escape prvo napušta svaki alatni tab

Zašto: audit komandi je pokazao da je capture handler za Escape štitio samo Krivulje/Bušenje/Poglede; iz Dodavanja/Uređivanja/Materijala/Proizvodnje/Naprednog događaj je dolazio do DesktopWindow.onClose i finishElementEditor(false), pa je neočekivano odbacivao cijelu sesiju. Handler sada za svaki editorTab koji nije basic prvo vraća basic i zaustavlja događaj. Nisu mijenjane granice Prihvati/Odustani niti osnovni Escape za zatvaranje.

Browser tab9 obnovljena soba/GRUPA_B: TEST_POMAK40→41 daje X41mm. Pojedinačno prošli Dodavanje, Pogledi, Uređivanje, Krivulje, Bušenje, Materijali, Proizvodnja, Napredno → Escape. Svih8puta editorcount1, Osnovni aria-current=page, varijabla41; završni rezultat41mm i aktivanUndo. Odustani vraća40. Nova sesija40→42, Escape sa Osnovni zatvara editor i vraća40, očekivana granica odbacivanja. Browser warn/error prazan; helper editor-escape-proof.json/jpg. Screenshot snimljen poslije povratka iz Naprednog; fokus dugmeta nije indikator aktivnog taba (Osnovni je aktivan). Probne41/42nisu ostale u modelu.

Build17513exit0; nema novih modelskih pravila, pa nisu pisani testovi koji bi samo prepisivali uslov. Posljednja puna regresija ostaje348testova/typecheck prethodnog koraka. Pregled ovog koraka potvrđuje mapu tabova i izlazak iz njih, ne sva dugmad i sve alatne operacije. Audit preostalih osnovnih komandi ostaje otvoren, prilagođeni cilj aktivan. Bez commita/pusha.


### 29.10.2026. — proizvodni pregled izolovanog potomka

Zašto: ElementDetails je gradio lokalnu krojnu/potrošnju samo od [element], pa je pri izboru vidljivog pod-elementa gubio skrivanje njegovih roditelja. Novi corpusElementProductionScope prati cijelu relativnu putanju iz postojećeg formulaRoot/formulaElementPath. Ako je neki roditelj skriven, za proizvodni obračun koristi nepromjenljivu kopiju cilja visible=false; izvorna vlastita vidljivost ostaje sačuvana. Editor prikazuje jasan status naslijeđenog izostavljanja. Uključenost ne miješati sa izolovanim 3D pregledom koji i dalje pokazuje izabrani dio.

Dvije regresije: skriveni root→vidljivo dijete→vidljiv unuk, svi potomci isključeni iz krojne i potrošnje bez promjene izvora; vidljivi roditelji vraćaju dvije grupe i pozitivnu kontrolu jedne potrošne stavke, referenca cilja ostaje ista. Nevažeća putanja odbijena. Puna regresija350/350 i build54593exit0; poslije preciziranja statusnog teksta završni build79023exit0. Nema novih hook uslova; memo obračuni koriste isti proizvodni kontekst za obje liste.

Browser tab10, helper production-ancestor-probe.S3D: PARENT_HIDDEN.visible=false, CHILD_VISIBLE.visible=true/1ploča/1POTITEM. Izbor djeteta kroz stablo → editor→Proizvodnja: grupe0/izostavljeno1/potrošnja0 i statusroditeljskogskrivanja; vlastita checkboxoznaka djeteta ostajeuključena. Odustani→roditeljvisibletrue→isti editor: grupe1/izostavljeno0/potrošnja1. Odustani→jedanUndo→opet skriveniroditelj vraća0/1/0; finalni status preciziran da ne tvrdi uključenu vlastitu vidljivost kad može biti isključena. Browserwarn/errorprazan, screenshothelperproduction-ancestor-hidden.jpg. Izvorni korisnički projekti nisu korišćeni za izmjene, kontrolni fajl je samohelper.

Ovo zatvara konkretan nedostatak proizvodnog obuhvata u editoru potomka. Audit preostalih osnovnih komandi i granica još nije završen; cilj aktivan. Bez commita/pusha.


### Nastavak nakon korisnikove potvrde obnove limita

Korisnik traži novi goal i nastavak rada. create_goal je odbio novi cilj jer postojeći ostaje active/unfinished; nije lažno označen complete niti mijenjan na uži uspjeh. Nastavak se obavlja pod postojećim aktivnim prilagođenim ciljem. Prekinuti record-production-ancestor.py sada je uspješno izvršen kroz normalno odobrenje: audit/progress/context/log ažurirani i350testova zabilježeno. Helper HANDOFF-PENDING-PRODUCTION-ANCESTOR.md označen razriješenim. git diff --check prolazi; sav postojeći rad ostaje bez commita/pusha.

Nastavljen audit granica komandi. Proizvodnja→Otvori krojnu listu je već pozivala finishElementEditor(true), pa je naziv prećutkivao prihvatanje sesije. Sada piše Prihvati i otvori krojnu listu, uz tooltip da sve primijenjene izmjene postaju jedna sobna radnja i otvara se krojna projekta. Handler i podaci nisu promijenjeni; ovo je pojašnjenje postojeće radnje, bez dodatne potvrde. Završni build73668 je uspješan (exit0; helper production-accept-label-build.txt). Posljednja puna regresija ostaje350, bez novih modelskih izmjena.

Naredni redoslijed ostaje: audit osnovnih aktivnih komandi i njihovog obuhvata, povezani tokovi i opravdane popravke. Ne ponavljati nedostupni native pristup bez novih uslova i ne predstavljati otvorene fizičke plohe/rubove, dinamičke spojeve ili Maretta profil kao završene. Novi goal nije kreiran zbog ograničenja alata; postojeći je aktivan.


### Kamera sobe po projektu — 29.10.2026.

Zašto: module-global retainedRoomCamera prenosio je kadar posljednje sobe na svaki novi/učitani projekat. Sam useRef bi izgubio povratak iz nacrta. Sada lib/corpus-camera-session.ts čuva kopirane vektore i oznaku pogleda u WeakMap po originalInspection identitetu; taj identitet ostaje isti kroz model edits/Undo, a novi projekat dobija novi React key i prazno stanje. Cleanup prethodnog projekta upisuje samo njegov scope. Pamćenje je sesijsko, ne zapisuje se u izvorni fajl.

Provjera: dvije regresije pokrivaju različite projekte istog naziva, stabilan ključ, kasni cleanup i izolaciju promjenljivih vektora. npm test:352/352; npm run build exit0 (postojeće upozorenje veličine chunka). Praktični browser tab2: novi prazan NOVI-IVERTIM-PROJEKAT.S3D → Bočni → Tehnički nacrt → 3D: Bočni aria-pressed=true i isti bočni prikaz; Novi projekat istog naziva → Bočni=false i vidljiva početna perspektiva cijele sobe. Screenshots u helperu camera-side-before.jpg, camera-side-return.jpg, camera-new-project.jpg vizuelno pregledani. Nije rađena proizvoljna orbit/pan proba niti udaljeni element; dokazana je izolacija projekata i povratak kroz nacrt na kontrolnoj sobi.

Cilj ostaje aktivan; ovo nije potvrda native Corpusa niti zatvaranje cijelog audita. Bez commita/pusha.


### Grupni izbor kroz strukturu ploča — 29.10.2026.

Zašto: grupni izbor je indeksni; stari ElementDetails effect je pri promjeni spiska naziva brisao cijeli izbor. Početna pretpostavka da oznake ostaju na pogrešnim indeksima nije predstavljala konačno ponašanje tog effecta. Sada corpus-board-selection.ts mapira izvorne indekse kroz pojedinačno/grupno kopiranje, linearni/2D niz, uklanjanje i pomjeranje. App applyStructuredE3dSource primjenjuje mapu; stari effect više ne briše izbor (resetuje samo poruku). Kopije ne postaju automatski označene, uklonjene ploče ispadaju iz izbora. Dodavanje na kraj i preimenovanje čuvaju indekse. Undo/Redo i dalje namjerno čiste grupni izbor.

Tri nove regresije porede odabrane nazive sa stvarnim writer/parse E3D rezultatima: višestruke umetnute kopije, višestruko uklanjanje i oba smjera pomjeranja; ulazna selekcija ostaje neizmijenjena. Konačna puna regresija355/355. Browser tab2 kontrolni board-selection-probe.E3D: A+C označene, A aktivna, Udvostruči ploču → nakon konačne popravke i naknadnog odvojenog čitanja ostaju A+C, kopije neoznačene. Raniji prolaz je ometen korisnikovom intervencijom koju je korisnik potvrdio; ni taj prolaz ni raniji screenshot board-selection-copy-proof.jpg nisu dokaz konačnog stanja. Poslije pokretanja promjene redoslijeda CDP je prestao odgovarati (Input.dispatchMouseEvent, zatim evaluate i getAXState timeout); UI promjena redoslijeda i uklanjanje još nisu potvrđeni. Nastaviti tu praktičnu probu kada kontrola ponovo odgovara, bez zaključivanja iz timeouta. Ne pripisivati svu nestabilnost browsera korisniku.

Cilj aktivan. Bez commita/pusha. Fizičke plohe/rubovi, dinamički spojevi i Maretta ostaju odvojene otvorene provjere.


### Dovršena praktična provjera grupnog izbora — 29.10.2026.

Nastavak prethodnog loga: stari tab2 više nije postojao, dev server90209 potvrđen živ. Novi browser tab3 otvorio je izvornu recent kopiju board-selection-probe.E3D (A,B,C,D), bez vraćanja prethodne izmijenjene recovery sesije. A+C označene, A aktivna; Pomjeri ploču dolje → redoslijed B,A,C,D i dalje samo A+C označene. Input.dispatchKeyEvent prijavio timeout, ali autoritativno naknadno čitanje DOM-a i screenshot dokazuju izvršenje; nije ponavljana ista komanda. Native CUA AX pregled hosta pokazao je izvršeno premještanje i nije našao otvorenu potvrdu. Ukloni izabranu ploču → B,C,D, samo C označena. Jedan editorUndo → B,A,C,D, grupni izbor prazan prema postojećoj Undo politici; Redo → B,C,D. Odustani → početni element sa4ploče. Dakle promjena redoslijeda, uklanjanje i istorija sada imaju i praktičan dokaz, ne samo testski.

Vizuelno pregledani helper screenshots board-selection-move-proof.jpg (A+C u redoslijedu B,A,C,D) i board-selection-remove-proof.jpg (samoC u B,C,D). Konačni prethodni build60247exit0 i355testova ostaju važeći, ovaj korak nije mijenjao kod. Raniji nevažeći board-selection-copy-proof.jpg se ne koristi. Audit cijelog osnovnog ciklusa i dalje aktivan; bez commita/pusha.


### Dopuna: ravnomjerni niz ploča

Audit svih poziva duplicate/remove/move u app.tsx našao je dodatni strukturni put distributeSelectedBoardArray. I on sada predaje copy mapu sa copiesCount; bez te dopune i nakon uklanjanja starog reset effecta oznake bi ostale na starim indeksima. Regresija proširena stvarnim duplicateCorpusE3dBoardCopies izlazom sa5kopija i provjerom da se i dalje biraju originalni B+D. Posljednji npm test355/355 i build24280exit0, helper board-selection-final-tests.txt / board-selection-final-build.txt.

Browser tab3: helperfixture omotač ispravljen na dokazane ESIRINA/EVISINA/EDUBINA i pozicijske atribute (prethodni generički WIDTH/HEIGHT nisu bili parsirani; prethodna proba izbora nije zavisila od omotača). Upload svježe helperkopije: mjere800×800×500. A+C označene, A aktivna, kopija1, Rasporedi original i kopije → A,A kopija,B,C,D, oznake ostaju samoA+C i poslije odvojenog ponovnog čitanja. Screenshot board-selection-even-array-proof.jpg pokazuje izvršen niz i aktivnu kopiju (tabela je skrolovana van kadra; autoritativan dokaz oznaka je DOM checked lista). Odustani vraća početni helper. Cijeli ovaj završni dio nije mijenjao korisničke projekte. Bez commita/pusha, cilj aktivan.


### Parametarske kopije čuvaju pomak — 29.10.2026.

Zašto: duplicateCorpusE3dBoardCopies mijenjao je samo DXPOS/DYPOS/DZPOS, ali ostavljao XF/YF/ZF izvorne ploče. Reprodukovano regresijom prije popravke: originalX25/XF SHIFT, kopijeX65/5 nakon recalc obje postajuX25, Y200/300 postaju100. To je stvarni gubitak rasporeda pri sljedećoj promjeni varijable.

Writer sada dodaje numerički pomak postojećem izrazu: (izraz)+(delta); ose bez izraza zadržavaju brojčani položaj, nulti pomak ostavlja izvorni izraz. Izvorna ploča i konture/rupe/obrade/nepoznati blokovi se ne prepisuju. Nepoznata formula ostaje nepoznata sa sačuvanim numeričkim položajem, ne pretvara se u nulu ili literal. Ako postoji izraz ali početna koordinata nije poznata, traženi pomak se odbija. positionCorpusE3dBoard koristi istu logiku za original u distributeSelectedBoardArray; time i original koji se rasporedom pomjera zadržava svoj novi položaj pri recalc. Samostalno Udvostruči bez pomaka i dalje zadržava izvorni izraz. Ovo ne mijenja opštu politiku ručnog unosa geometrije, koja ne briše formule.

Tri nove regresije: pomak/varijabla/reopen, ravnomjerni original+kopija i odbijanje nepoznate početne koordinate, XMLescaped uslov/unknown/nultaosa. Puna regresija358/358, npm run build exit0, git diff --check čist. Helper copy-formula-tests.txt/copy-formula-build.txt.

Browser tab3 helper copy-formula-probe.E3D: SHIFT25, A X25/Y100. Niz1 sa korakomX40 iY100 → A kopija X65/Y200 XF=(SHIFT)+(40), YF=(100)+(100). SHIFT40 → originalX40, kopijaX80. EditorUndo kopija65, Redo80; Prihvati. Stvarni download C:/Users/Korisnik/Downloads/copy-formula-probe-IVERTIM.E3D nezavisno pročitan: SHIFT40, original40/100, kopija80/200 i oba UNKNOWN ID=keep. Novi tab4 upload baš tog downloada → izraz(SHIFT)+(40), rezultat80mm. Screenshot parametric-copy-offset-proof.jpg vizuelno pregledan.

U tab4 dodatno: A→Rasporedi original i kopije (jedna kopija, osaY, odmak0) → originalY0 saYF=(100)+(-100), nova A kopija2 Y782 saYF=(100)+(682). PromjenaSHIFT50 → obaX50, originalY0 i novaY782 ostaju; potvrđeno nakon odvojenih čitanja završenog rendera. Screenshot parametric-even-copy-proof.jpg. Odustani vraća izvezeni helper SHIFT40/dvijeploče; tab3 ostaje prihvaćena kontrolna kopija, tab4 označen za nastavak. Korisnički projekti nisu korišćeni za ove izmjene.

Cilj aktivan; ovo nije proizvodna potvrda Corpusa ni makroa. Bez commita/pusha.


### Parametarsko grupno postavljanje E3D — 29.10.2026.

Zašto: brojčani grupni pomak nije mijenjao izvorne izraze, pa recalc vraća A/B sa65/165 na25/125. Reprodukovano padajućom regresijom prije popravke. Prosto dodavanje40 na oba izraza takođe nije ispravno kadaB već pratiA.

Novi lib/corpus-board-placement-formulas.ts računa korekciju izraza u kontekstu traženih koordinata cijele pomjerene grupe, dok neoznačene zavisnosti ostaju aktivne. Offset se dodaje samo gdje treba; unutrašnja B=A.x+100 ostaje ista ako već daje cilj. Sve ose pomjerene ploče uzimaju ciljne brojeve, uključujući održavanje druge ose kada njen izraz zavisi od pomjerene prve. Nepoznati izrazi ostaju nepoznati sa pomakom i ciljnim sačuvanim brojem; ne glume riješenu proizvodnu geometriju. Potom se preračunava cijeli E3D i provjeravaju ciljne koordinate prije promjene projekta. Povezano u pet strukturiranih puteva app.tsx: grupni pomak, pojedinačni tastaturni pomak, ravnomjerna raspodjela, poravnanje i grupno postavljanje u element. Omotač/dimenzije koje naknadno zavise od položaja nisu ovim potvrđene kao ponovo poravnate po novom omotaču.

Važna granica nastavka: ovi putovi kada structuredE3dTarget ne postoji i dalje koriste postojeći applyBoardGroupModel brojčani fallback. Originalni S3D i lokalni potomci van podržanog strukturiranog korijena ovim nisu popravljeni za promjenu izraza; taj put treba naredno auditirati i uskladiti uz očuvanje izvornog XML-a. Ne predstavljati ovaj korak kao univerzalni popravak svih formata ili ručnog geometrijskog unosa. Cilj ostaje aktivan.

Pet regresija: direktna i posredna zavisnost kroz neoznačenu ploču, druga osa vezana za pomjerenu, nepoznate formule/imutabilnost/opaqueatributi, plus poravnanje/raspodjela/postavljanje/pojedinačni pomak i kasnija promjenaSHIFT. Puna regresija363/363 i build48560exit0, git diff --check čist. Helper placement-formula-tests.txt i placement-formula-build.txt.

Browser tab4 helper placement-formula-probe.E3D: A25/XF SHIFT, B125/XF A.x+100, C500/XF500. OznačeneA+B, grupniX40/Y0/Z0 → B165 sa neizmijenjenim izrazomA.x+100. SHIFT40 → A80/XF(SHIFT)+(40), B180, neoznačenaC500. Undo varijable → B165; jedan dodatniUndo cijelogpomaka → B125; dvaRedo → B180. Prihvati i stvarni download C:/Users/Korisnik/Downloads/placement-formula-probe-IVERTIM.E3D nezavisno pregledan: A80/B180/C500, SHIFT40, triCUSTOM=keep. Novi tab5 upload baš tog fajla → B180 iizrazA.x+100; SHIFT50→B190. Odustani vraća stanje izvoza. Screenshot parametric-group-placement-proof.jpg vizuelno pregledan. Izmjene samo na kontrolnom helperu, bez korisničkih projekata. Bez commita/pusha.


### S3D i pod-elementi: pomak sa sačuvanim izrazima — 29.10.2026.

Zašto: prethodni strukturirani E3D put bio je popravljen, ali model-only fallback i JSON verzije9 nisu čuvali promjene izraza ploče. Novi prepareCorpusBoardPlacement računa u punom korijenskom kontekstu i prima tačnu ELM putanju, pa koristi roditeljske varijable i reference bez izdvajanja potomka. App applyBoardPlacementModel povezan je na pet postojećih pozicijskih komandi; provjerava i uređivost svih predaka, primjenjuje puni preračunati korijen kao jednu history radnju i vraća isti lokalni izbor. Izgled/vidljivost nastavljaju koristiti zaseban postojeći helper.

Radna kopija sada verzija10: boardFormulaChanges čuva elementPath, boardIndex, naziv, before/after poznatih9ključeva. JSON restore provjerava tačan izvorni skup formula, odbija stale baseline i nepoznate ključeve; čita1–9. Writer S3D/E3D upisuje formulu i bez brojčane promjene, podržava uklanjanje izraza, nalazi tačnu ploču/putanju i čuva ostali XML. Novi testovi: naslijeđenaSHIFT na [0,0], JSON+recovery roundtrip, stvarni S3D writer+reparse+promjena roditeljske varijable u modelu, formula-only/brisanje/XMLescaping/nepoznatiblokovi, v10validacija i v9kompatibilnost. Puna regresija367/367, završni build42698exit0, git diff --check čist. Helper s3d-formula-tests.txt / s3d-formula-build.txt. Jedine kasnije testne izmjene poslije pune regresije bile su TypeScript anotacije praznog recorda radi builda.

Praktično tab5 helper placement-formula-nested-probe.S3D: Parent.SHIFT25, Child A25/XF SHIFT, B125/XF A.x+100. Childeditor→Dodavanje→A+B→X40/Y0/Z0: A65/XF(SHIFT)+(40), B165/XFA.x+100. JedanUndo→B125; Redo→B165; Prihvati. Stvarni JSON download placement-formula-nested-probe.ivertim-corpus.json nezavisno pregledan: version10, jedini formula diff [0,0]:0 SHIFT→(SHIFT)+(40). Stvarni Export→Corpus S3D/E3D download placement-formula-nested-probe-IVERTIM.S3D: A65/B165, ispravne formule i obaOPAQUE value=unchanged.

Novi tab6 Vrati sesiju iz lokalnog oporavka → Child.A65 sa(SHIFT)+(40). Novi tab7 upload baš preuzetog S3D-a → Child.A65 sa(SHIFT)+(40), B165 saA.x+100. Bez oslanjanja na recent kopiju ili skriveni browser store. Screenshot s3d-nested-placement-proof.jpg vizuelno pregledan. Izmjene samo u kontrolnom helperu; korisnički projekti nisu mijenjani.

Granice: postojeći originalni S3D UI i dalje čuva promjene postojećihEVAR bez lokalnog preračunavanja konstrukcije (poruka to navodi); taj tok nije ovim proširen i ne tvrditi da je praktično dokazano S3D UI SHIFT25→40. Test modelskog preračunavanja dokazuje da sačuvani izrazi daju80/180 kad se evaluator pozove. Promjena mjera koja posljedično mijenja proizvodne obrade i fizičke strane ostaje van ovog dokaza. Cilj aktivan, bez commita/pusha.
