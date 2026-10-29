# Corpus front construction / CLR context

Datum: 2026-10-27. Cilj je ispravno povezivanje promjene mjera prije umetanja bibliotečkog E3D elementa. Ovo je evidencija otvorenog konteksta, ne implementirana specifikacija.

## Potvrđeno iz stvarnog D1V
- Klasa pod-elementa Fronta je TfrontaElement.
- Njegove ESF/EHF formule koriste roditeljske mjere i reference. Novi graf preračunava omotač.
- Direktna ploča FRD ima XF=CLRX, YF=CLRY, HF=CLRH, SF=CLRW. Njena spremljena geometrija je 596x716 kada je omotač fronte596x716; jedna jednakost nije dokaz opšteg CLR pravila.
- Pored standardnih tagova, Fronta ima binarni EFRDATA, sa identifikatorom TRNF i verzijom0. Među čitljivim imenima polja su UQ, orr, otf, porf, porn, odm, odmm, mpv, mph, dof. Poslovna značenja ovih polja nisu potvrđena.
- Postojeći strogi binarni čitač odbija taj uzorak kod sirovog netagovanog dijela (@54); nije dodana pretpostavljena šema.

## Inventar lokalne kopije Elmsav
Pretraženi su E3D fajlovi u public/local-corpus/Elmsav. Broj pojavljivanja EFRDATA:7694; različitih HEX sadržaja:906. Dužine različitih sadržaja u bajtovima:106→460, 40→381, 105→3, 39→41, 108→6, 42→14, 20→1.
Ovo nisu906 poslovnih tipova fronti: viđeni su barem TRNF i TRuckicaSetup identifikatori. Prikazani nazivi polja nisu semantičke definicije. Pregledani primjer Aurora_Base_Handles/BC_1DR_2DR.E3D ima drugačije otf/porf/dof vrijednosti od jednostavne D1V fronte.

## Statička analiza i njena granica
REA open_binary vezao je CorpusSolutions.exe, veličina64372224, SHA25637613211263140d888de2ef6be91341479e0c25bd43b7fa180e314d3d602090c, PE x86_64. search_strings za CLRW završio je execution_failure: Ghidra12.1.4 exited before bridge startup, exit4294967295. Nema dekompajlerskog dokaza za CLR ponašanje. Ista analiza nije ponovljena.
Read-only rea doctor --client codex: Codex registracija/node/Ghidra12.1.4/JDK21 zdravi. Nisu mijenjane konfiguracije niti instalirani drugi engine-i. U direktnom ciljanom ASCII/UTF16 byte pregledu velikih/malih CLRW/CLRH/CLRX nije nađen doslovni string; to ne dokazuje odsustvo obrade dinamički sastavljenog imena.

## Sljedeći dokaz
Kontrolisana kopija stvarnog E3D u izvornom Corpusu, sa promjenom samo jedne mjere i snimanjem nove kopije. Uporediti omotač, FRD, konturu i EFRDATA. Obuhvatiti jednostruku frontu i barem jednu podijeljenu/okvirnu frontu prije generalizacije. Originalne biblioteke/projekti se ne prepisuju. Ne mapirati CLRW na širinu i CLRH na visinu bez dokaza tipa fronte i rasporeda.

## Stanje implementacije
Hijerarhijski graf i ciljana obnova pravougaonih kontura postoje i imaju282 testa/build. CLR kontekst još nije riješen; bibliotečki dijalog još nema nova polja za resize. Poznato ograničenje se ne smatra dovršenim radom. Izvorni izrazi i EFRDATA ostaju u XML kopiji.


## Dopuna 2026-10-28 — PE resursi bez Ghidre
REA inspect_pe_resources uspješno je read-only pregledao isti CorpusSolutions.exe (isti SHA25637613211263140d888de2ef6be91341479e0c25bd43b7fa180e314d3d602090c). Evidence ev_280c179dc7a74700decaa15a5433d5462b7552b5a6ce73b7812e2fc2fee0e5a5, provider rea-pe-resources v1. Pokrivenost direktorijuma complete:1078 pregledanih stavki,533 resursa. Ovo nije dekompajlirana poslovna logika.

Ciljani RCDATA resursi ponovo su pročitani sa vraćenih file offseta, uz potvrdu dužine i SHA256:

| Resurs | Offset | Bajtova | Početak sadržaja |
|---|---:|---:|---|
| TDASKAFRONTAEDITFORM |41866076|1252|9bc58feb68c68036|
| TELEMENTEDITBASICFORM |42766788|11798|9bc58feb69c6813b|
| TELMLOADER |42807580|172507|9bc58feb76c6813b|
| TINSERTELEMENTFORM |46798732|7740|9bc58feb6ec68d39|

Nijedan nema plain Delphi TPF0 zaglavlje54504630. Prethodni MaterialEditor DFM čitač zato nije primjenljiv. Početni pokušaj dekodiranja dao je neusaglašene tipove; njegov izlaz nije korišten za značenje polja. Nije dokazano da je sadržaj šifrovan, kompresovan ili kojim postupkom bi se obrađivao. Ne nagađati iz nasumično protumačenih bajtova.

Lokalni dokazi su u helper workspace-u Ivertim-corpus: corpus-front-pe-resources.json (odabrani REA offseti/digesti) i corpus-front-forms-decoded.json (samo format/gate observations; decoded=false, nula protumačenih svojstava). Sirovi sadržaji resursa nisu upisani u vault niti dodani u Git.

CUA ponovo vidi native Corpus prozor2425954, ali getApp i dalje završava porukom da je prozor minimizovan; trenutni CUA API ne izlaže aktivaciju koju poruka traži. Nije izvedena kontrolisana originalna resize proba i originalni projekat nije mijenjan. Novi nalaz sužava istraživanje: PE tabela je dostupna bez Ghidre, ali sama ne daje CLR pravila. Sljedeći dokaz ostaje kontrolisana runtime proba ili stvarni izvršni kod koji obrađuje frontu.


### Ghidra produženi pokušaj — živ proces i PE zaštitni trag
- functions.wait cell19 i dalje vraća Script running; isti JavaPID28568 opažen CPU142.25s/WS0.88GB pa CPU305.5s/WS1.13GB. OS slobodno3.56GB pri prvom opažanju. Ovo potvrđuje rad, ne završetak; ne restartovati dok je poziv živ.
- Read-only PE sekcije: istiSHA37613211263140d888de2ef6be91341479e0c25bd43b7fa180e314d3d602090c;20sekcija,19sa __wibu prefiksom. EntryRVA0x396ec60 je u __wibu0a. __wibu00 ima34900480rawbajtova/executable i entropiju7.997 na prvih65536bajtova; __wibu0a9903616raw/executable,entropija6.805. Tačni offseti/veličine/uzorci u helper corpus-pe-section-summary.json.
- Inference: Wibu zaštitni sloj je vjerovatan; nazivi i entropija sami ne dokazuju tačan profil, algoritam šifrovanja, uzrok Ghidra timeouta ni dostupnost originalne poslovne logike. Ne proglašavati obični statički rezultat dekompajliranim Corpus pravilima bez provjere.
- Primarna referenca WibuKey Developer Guide6.11 (official cdn.wibu.com, strana Windows Applications/File to Protect) opisuje AxProtector zaštitu/enkripciju PE EXE/DLL. URL sačuvan u helper reportu. To je kontekst tehnologije, ne certifikat konkretnog Corpus builda. Za ovu kopiju nije rađena izmjena zaštite/licence niti izvršnog fajla.
- Sljedeće: završni odgovor istog cell19 (20minstartup). Ako dobije rezultate, prvo provjeriti da potiču iz smislenog programskog koda, pa tek onda CLR/OVERLAP reference. Aplikacija nije mijenjana; goal aktivan, bez commita/pusha.


## Produzeni CLI pokusaj - konacan ishod

- Autoritativni execsession63987 zavrsen exit1; provider_timeout nakon1200000ms (20min), run7910023f-7034-4eab-b0ea-9141c8872f1f. Ovo je REA provider rok, ne raniji MCP transportni450s rok. Ghidra12.1.4 je pokrenuta, importovala cilj i radila analizu, ali bridge/query nisu zavrseni. Nema upotrebljivih CLRW/OVERLAPXL/PARAMEB rezultata.
- Zadnja OS provjera JavaPID19644 CPU580.83s/WorkingSet1276563456bajtova, log aktivan do kraja pokusaja. Nema potvrdjenog OutOfMemoryError; memorija se ne moze iskljuciti kao uzrok. Pokretanje ima -Xmx2G, sto nije isto sto i ukupni slobodan RAM.
- Nakon zavrsetka Java19644 i Node12872 vise nisu prisutni. Nije pokrenut cetvrti import niti dalje povecavan rok. Sirovi REA error je sacuvan u helper ghidra-cli-search-result.json, kratak izvjestaj ghidra-cli-search-summary.json. Rezultat je nepotpun i ne smije posluziti kao dokaz poslovne semantike.
- Zasto: korisnik je trazio ponovni pokusaj poslije rasterecenja racunara. Pokusaj je stvarno izveden i ispracen do zavrsetka. Dalji dokaz je kontrolisana proba u izvornom Corpusu ili ciljana analiza manjeg potvrdjenog modula; ponovni puni import bez nove promjene uslova nije opravdan. Originalni Corpus fajl i aplikacijski kod nisu mijenjani; bez commita/pusha. Glavni razvojni goal ostaje aktivan.
