# Corpus — vodič kroz snimak editora elemenata

Izvor: lokalni `recordings/Editor elemenata.mp4`, trajanje **10:58,87**, 1920×1080, 30 fps. Pregled 2026-10-24. Prvi snimak je indeksiran u [osnovnom vodiču](corpus-basic-recording-guide.md); objedinjena specifikacija je u [mapi toka rada](corpus-workflow-map.md).

## Pouzdanost i lokalni materijal

Puni automatski transkript je u `recordings/editor-transcript.jsonl`, čitljivi tekst sa minutama u `editor-transcript.txt`, a titlovi u `editor-transcript.srt`. Prvi snimak sada takođe ima TXT/SRT uz raniji JSONL. Sirov govor obrađen je lokalnim faster-whisper small modelom (hr); kritični intervali 01:48–03:32, 06:28–07:38 i 08:48–10:58 dodatno su dekodirani sa srpskim jezikom u `editor-transcript-sr-check.jsonl`.

**Automatski transkript ima mnogo grešaka i nije ovjeren doslovan zapis.** Nejasne riječi nisu prepravljane kao da su sigurno izgovorene. Ovaj vodič je redigovan tematski indeks, zasnovan na govoru i čitljivim kadrovima. Precizni nazivi, vrijednosti i formule ispod prepisani su sa ekrana. Snimci i sirovi transkripti ostaju lokalni, ignorisani u Gitu.

Vizuelni pregled: osnovni niz oba videa na svakih 15 s, zatim gušći nizovi 2–5 s oko formula, problema poništavanja, alatnih tabova, dodavanja, krivulja i bušenja. Izdvojeno 299 vremenskih uzoraka ukupno (neki se preklapaju), pregledani kontakt-listovi i važni kadrovi u punoj rezoluciji. Ovo nije reprodukcija komandi u živom Corpusu; snimak ne dokazuje sve semantike.

## Najvažniji zaključci

1. Editor je samostalan radni kontekst: veliko 3D polje lijevo, tabovi alata iznad, desno stablo i svojstva elementa, ispod prikaza stalni podaci izabrane ploče. Nije samo dijalog sa mnogo polja.
2. Izbor u sceni i stablu mora predstavljati isti dio. Izabrana ploča je ljubičasta. Privremeno skrivanje fronti služi pristupu unutrašnjosti; to ne dokazuje izostavljanje iz proizvodnje.
3. Polje ima **izraz i izračunatu vrijednost**. Primjer `PLAFON X = 18.00`, izraz `lijevi_bok.debljina`. Ručni broj ne smije neprimjetno uništiti zavisnost.
4. Varijable se dodaju, brišu i prenose između elemenata. Pored vrijednosti postoji katalog funkcija. Import/export format i reset semantika nisu razjašnjeni.
5. Broj pregrada/polica, uvlaka, debljina, jednaki ili ručni razmaci i fiksnost pojedinačne police imaju direktno značenje za konstrukciju i obrade.
6. Bušenje je povezano sa pločom, makroom i stranom 0–5, ne samo nacrtanim kružićima. Veza sa skriptama i parametrima ostaje najvažnija tehnička istraga.
7. Korisnik pokazuje nejasne opcije i neprijatne tokove. To je istraživački trag, a ne automatski spisak funkcija za kopiranje ili brisanje.

## Vremenski indeks

| Interval | Govor i vizuelni dokaz | Zadatak za Ivertim 3D |
|---|---|---|
| 00:03–00:24 | Glavno okruženje i prelazak u editor; korisnik kaže da je trenutna osnova blizu, ali treba dorade. | Sačuvati poznat raspored; ne proglasiti raniji prototip potpunim Corpus editorom. |
| 00:24–01:20 | Editor G2V; rotiranje/pomjeranje prikaza; klik ploče prikazuje donji panel. Desni panel se proširuje zbog uskog prikaza na laptopu. | Podesiva širina desnog panela i visina donjeg; izbjegavati odrezana polja. Tačne gestove miša još provjeriti. |
| 01:20–01:49 | Skrivanje/otkrivanje fronti kroz stablo. Ostaju korpus i police, izabrani plafon ljubičast. | Privremena vidljivost editora, sinhronizovan izbor, pristup unutrašnjosti bez brisanja. |
| 01:49–02:12 | Desni klik/ulazak u polje otvara donji uređivač izraza umjesto običnog brojčanog unosa. | Uvijek razumljiv ulaz u izraz; prikaz broja i izvora zajedno. |
| 02:12–02:37 | Prozor Varijable i tab Opis funkcija. Korisnik ukazuje na nelogičan tok prozora/fokusa. | Katalog varijabli i funkcija mora biti dostupan bez gubitka polja i selekcije. Precizan kvar tek reprodukovati. |
| 02:37–03:07 | Dodavanje/brisanje, snimanje i otvaranje skupa varijabli; prikazan file dijalog. | Prenos setova varijabli; ne nagađati ekstenziju ili šemu dok ne dobijemo uzorak. |
| 03:07–03:32 | Ručni pokušaj promjene položaja/formule, neočekivano izmještanje plafona udesno; primjedbe na Undo i vraćanje. | Regresioni scenario izraza, geometrije i istorije. Tačan niz tipki nije potpuno dokazan. |
| 03:32–03:55 | X/Y/Z uglovi i rotiranje izabrane ploče. | Lokalni položaj i lokalna rotacija ploče, bez pomjeranja sobe/kamere. |
| 03:55–04:39 | Tip, smjer, PD, staklo i kolizija; preklapanje se označava crveno/ružičasto. Korisnik više vrijednosti ne poznaje. | Razdvojiti vizuelne zastavice i proizvodnu semantiku; PD istražiti, ne izmišljati značenje. |
| 04:39–05:04 | Kant trake raspoređene oko malog dijagrama ploče, izbor pojedinačne ivice i materijala. | Veza četiri ivice ↔ prikaz ploče ↔ stvarna orijentacija; mapa ivica treba dokaz. |
| 05:04–05:39 | Osnovni tab: učitaj/spremi/štampa, pomicanje/rotiranje, približavanje, postavke, grupisanje i osvjetljenje. | Inventar komandi, tooltipovi, pouzdan povratak iz režima. Ne pretvarati svaki meni u novu funkciju bez potvrde. |
| 05:39–06:28 | Skripte, boja pozadine, pomoć/postavke i kratki pregledi dodataka. Korisnik govori da dio ne poznaje. | Skripte i dodatke voditi kao odvojenu istragu. Prikaz palete nije zahtjev za fluorescentnu temu. |
| 06:28–07:00 | Tab Dodavanje; fronta se skriva, postojeće police uklanjaju da bi se prikazao novi raspored. | Jasna razlika sakrivanja i uklanjanja; ne gubiti obrade/zavisnosti bez upozorenja. |
| 07:00–07:19 | Dodavanje pregrada: broj, uvlaka, debljina, jednak razmak, ručni raspored, zaokruživanje i lista pozicija. | Grupno generisanje sa pregledom rezultata i jednim potvrđenim korakom. |
| 07:19–07:40 | Dodavanje polica; četiri police, debljina 18, uvlaka 20; globalna i pojedinačna fiksnost. | Parametarski raspored i veza fiksnosti sa bušenjem/spojem. Tehnologiju ne zaključivati samo po checkboxu. |
| 07:40–08:00 | Pogledi i Uređivanje; zum, promjene orijentacije, dupliranje/brisanje. | Izbor ostaje stabilan pri promjeni pogleda. Ne uvoditi automatsko skakanje kamere pri izmjeni geometrije. |
| 08:00–08:27 | Select Materials Boards: katalozi, korpus/fronta/leđa, materijali i rubne trake, pretraga i izbor dekora. | Materijal sa ciljnim obuhvatom, lokalne biblioteke i jasan pregled šta se mijenja. |
| 08:27–08:52 | Dodatni rubni/okov/potrošni prozori. Stablo Fittings prikazuje kant, tiple, konfirmate i izvore po pločama. | Istražiti odnos geometrije, potrošnje i skripte; ne duplirati iste podatke u nepovezanim prozorima. |
| 08:52–09:49 | Krivulje; bijeli/praktično prazan prikaz sa tačkama, drugačiji desni panel, ulazak u liste makroa. Korisnik pokušava da se vrati i izražava nezadovoljstvo. | Režim uređivanja mora biti vidljiv i izlaz jasan. Snimak sam ne dokazuje deadlock, pad ili gubitak podataka. |
| 09:49–10:08 | Povratak na model i žičani prikaz sa obradama. | Prikaz rupa i spojeva na cijelom elementu uz očuvanje selekcije. |
| 10:08–10:34 | Lista makroa po pločama, parametri CONNECT i brojevi strana 0–5; uključivanje/isključivanje. Donji panel rupe: ploha, položaj, dubina, prečnik/radijus, mirror/offset. | Proveriti svih šest strana i izvor svake rupe; nema automatskog nagađanja referentne ravni. |
| 10:34–10:59 | Prihvati izmjene; pomen primjene na sve elemente; desne varijable kao u glavnom prikazu. | Potvrditi obuhvat: ovaj primjerak, istoimeni/isti tip ili svi odabrani. Jasna potvrda i jedan Undo za grupnu primjenu. |

## Vizuelna specifikacija editora

### Raspored

- Gornji tabovi: **Osnovni, Dodavanje, Pogledi, Uređivanje, Krivulje, Bušenje, Kotiranje**, zatim **MetaReport, BLUM, Corpus_Scripts, DTC, Grass, GTV, Hettich, HRANIPEX, SOLUTIONS_DRILL**. Posljednji niz je samo viđen; funkcionalnost tih dodataka ovim nije pregledana.
- Ispod aktivnog taba ide njegova alatna traka. To je drugačije od glavnih padajućih menija projekta.
- U širem editor prikazu desni panel zauzima oko 495 od 1920 px; početno je uži. Primjer 01:45: canvas x=0–1425, y=130–720; donji panel y=720–990. Proporcije su dokaz rasporeda, ne obaveza fiksnih piksela.
- Desno odozgo: **Prihvati izmjene**, kontrole redoslijeda/dodavanja/brisanja, stablo, osnovna svojstva elementa, grupisane varijable. Panel može mijenjati sadržaj u režimu krivulja.
- Dole lijevo: **Ploha**, Naziv, Šifra, XYZ, mjere, tri ugla, tip i smjer. Dole sredina/desno: četiri ivice/kantovi ili polja aktivne obrade. Scene i svojstva moraju ostati istovremeno dostupni.
- Ljubičasta označava aktivnu ploču, crvenkasta koliziju, žičani prikaz otkriva obrade. Izgled nije dokaz proizvodne uključenosti.

### Polja pročitana sa ekrana

- Element G2V: Visina **720**, Širina **818**, Dubina **320**; Name/Code, Tip elementa, Vrsta, Opis, Napomena, Ispisuj, Ispisuj dijelove, ErpCode/1/2.
- PLAFON u 01:45: X **18**, Y **702**, Z **0**; Visina **782**, Širina **300**, Debljina **18**; Smjer **Horizontalni**, Tip **Korpus**. To su Corpus nazivi polja ploče; Visina ovdje nije svjetska vertikalna dimenzija.
- Zastavice: **Posebni materijal**, **Staklo**, **Sakrij koliziju**, **Zanemari God**, **Okreni God**, **PD**. Sam naziv ne dokazuje značenje PD ili uticaj na optimizator.
- Primjeri varijabli: `TIP_LEDJA`, `LEDJA_UVUCENA=17`, `DUBINA_FALCA_ILI_NUTA=10`, `SMANJI_LEDJA_NAKUCAVANJE=2`, `ZAZOR_=4`, `PREPUSTENA_FRONTA=20`, `TIP_SPAJANJA`. Vrijednosti su primjer tog elementa, ne globalni standard.
- Dokaz formule: `lijevi_bok.debljina` → PLAFON X **18.00**. U Varijablama postoji i `if((tip_ledja=3) or (tip_ledja=4);0;1)` za `ShowD_Ledja`, kao i `IF(VIDLJIVOST_NOGICA=0;1;0)`.
- U katalogu funkcija vidi se `if(x1;x2;x3)`, min/max, abs, sin/cos, stepeni/radijani, logaritmi. Ne prepisivati eventualno pogrešne opise matematičkih funkcija kao računsku specifikaciju.
- Dodavanje polica: 4 komada, 20 mm uvlaka, 18 mm debljina, prikazana mjesta 140/280/420/560 i pojedinačni nazivi/fiksnost. Prikaz uključuje nejednaku promjenu jedne stavke; ne svoditi na prostu kopiju četiri iste ploče.
- Makroi na ekranu: `LEDJA`, `KORPUSIRANJE`, `PERFORACIJE_3_RUPE`; parametri npr. `CONNECT=45`, `mindistance=-16`, `CONNECT=23`, `maxdistance=5`. To su primjeri, ne definicija CONNECT protokola.
- Obrade u listi: `TIPLANJE_OBJ`, `KONF_OBJ`, `FALC_NUT`, `raster1_DOLE_BOK`, `raster1_GORE_BOK`, perforacije. Panel pokazuje i Start X/Y, Ploha, Dubina, R/Ø i zavisnost od grupe. Razliku R/Ø dokazati iz podataka prije proizvodnog izvoza.

## Otvorena istraživanja

| ID | Šta nije razjašnjeno | Dokaz potreban za zaključak |
|---|---|---|
| E-01 | Tačni klikovi za izbor, orbitu, pomjeranje i dvoklik/right-click polja | Kratak kontrolisani pokušaj po komandi, bez istovremenih promjena. |
| E-02 | Tip/smjer/PD i posebni materijal | Primjer E3D prije/poslije sa promjenom samo jednog polja i izlaznom listom. |
| E-03 | Format varijabli, kolizija imena i reset | Sačuvan fajl skupa varijabli, import na drugi element, ponašanje pri istom imenu i kružnim zavisnostima. |
| E-04 | Tačan Undo kvar oko 03:15 | Originalni element i zabilježen izraz prije/poslije, tipke i istorija. |
| E-05 | Fiksna polica → tiple/konfirmat/nosač | E3D/obrade prije/poslije samo jedne oznake fiksnosti. |
| E-06 | Strane 0–5 u svim orijentacijama i CONNECT | Isti makro na horizontalnoj, vertikalnoj i frontalnoj ploči; vidljiv početak i smjer bušenja. Povezati sa [postojećom analizom](macro-runtime-context.md). |
| E-07 | Primjena na sve elemente | Dva ista i jedan drugačiji element; jedna izmjena, pregled svih posljedica i Undo. |
| E-08 | Krivulje, hvatišta, izlaz i predlošci | Jedan kompletan jednostavan primjer sa ulazom, izmjenom, prihvatanjem i izlazom. |

Istraživanje može proći kroz lokalnu pomoć, postojeće read-only Corpus podatke i kontrolisane uzorke; ne mora svaka stavka zahtijevati novi veliki video od korisnika. Nije potreban kompletan katalog addona da bismo dovršili ovaj osnovni proizvodni tok.
