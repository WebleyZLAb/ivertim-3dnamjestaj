# Corpus → Ivertim 3D: mapa toka i naredni ciklus

Izvori su dva korisnikova lokalna snimka, pregledana 2026-10-24: **Osnovno snimanje, 16:20** i **Editor elemenata, 10:59**. Detaljni indeksi: [osnovni snimak](corpus-basic-recording-guide.md) i [editor](corpus-editor-recording-guide.md). Zaključci ovdje nisu tvrdnja da je pregledan cijeli Corpus, svi dodaci ili da je već postignuta funkcionalna jednakost.

## Smjer koji je korisnik potvrdio

Prvo dovršiti poznati osnovni tok što bliže Corpusu, kroz snimke i korisničku probu. Poslije tog ciklusa dolaze veće prepravke, pojednostavljivanje i izostavljanje nepotrebnih funkcija. Pouzdanost, ispravno poništavanje i izlaz iz režima zahtjevi su već za osnovnu implementaciju — greška iz Corpusa nije željeno ponašanje.

Potvrđeni identitet Ivertima ostaje: ime Ivertim 3D, loader i logo, srpski jezik, Iconsax Line/Twotone/Bulk. Trenutna plava tema ostaje do kasnijeg brend preuređenja. Vjernost se odnosi na prepoznatljiv raspored, smisao komandi i tok rada, a ne na kopiranje svakog vizuelnog detalja, broja prozora ili greške.

## Osnovni proizvodni krug

1. Pokreni → loader → Novi/Učitaj/Nedavni projekti.
2. Otvori sobu/projekat → riješi nedostajuće materijale i okove bez tihog gubitka.
3. Izaberi element iz biblioteke → pregled i mjere → ubaci i postavi u fiksnu sobu.
4. Otvori editor → izaberi ploču u sceni/stablu → izmijeni geometriju ili formulu.
5. Podesi konstrukcijske varijable → rasporedi police/pregrade → materijali, kantovi i obrade.
6. Prihvati izmjene sa jasnim obuhvatom → vidi rezultat u sobi → Undo/Redo.
7. Sačuvaj prerađeni element kao novi E3D za ponovnu upotrebu.
8. Pregledaj potrošnju/krojnu listu → CSV i tehnička dokumentacija → postojeći proizvodni tok.

## Mapa ekrana i ponašanja

| Područje | Dokaz iz snimaka | Primjena / razlika prema sadašnjem prototipu |
|---|---|---|
| Pokretanje | Osnovni 00:02–00:29 | Loader i početni prozor već postoje sa potvrđenim Ivertim izmjenama; recent je lokalna kopija, nije živa putanja. |
| Glavna radna površina | Osnovni 00:45, 04:00, 13:45 | Meniji gore, alatke ispod/lijevo, scena centralno, Elementi/Soba desno. Prototip ima osnovu; treba proći tačno grupisanje i obuhvat komandi. |
| Desni panel projekta | Osnovni 06:15–07:30 i 16:08 | Stablo, svojstva i grupisane konstrukcijske varijable mijenjaju sadržaj prema kontekstu. U prototipu su varijable još dublje u detaljima; približiti njihovu dostupnost. |
| Izbor i pomjeranje | Osnovni 05:27–06:20; Editor 00:24–01:49 | Sinhronizovan izbor, lokalne ose, stabilna soba/kamera. XYZ kamera već popravljena. Miš/prečice provjeriti odvojeno od promjene geometrije. |
| Biblioteka | Osnovni 04:55–05:51 i 13:45–14:28 | Dva pristupa: folder sa malim prikazima i poželjnije stablo + veliki rotirajući pregled + mjere. Naš prozor već prati drugi pristup. |
| Editor | Editor 00:30 i 01:45 | Gornji tabovi i alatna traka, velik viewport, desno stablo/svojstva/varijable, dole kontekst ploče. Postojeći editor ima mnogo podataka, ali još nije ovaj raspored. To je prvi sljedeći zahvat. |
| Formule | Editor 01:49–03:32 | Odvojeni prikaz izraza i rezultata, reference drugih ploča, katalog varijabli i funkcija. Povezati postojeći evaluator; ne pretvarati nepoznatu formulu tiho u broj ili nulu. |
| Dodavanje dijelova | Editor 06:28–07:40 | Broj, debljina, uvlaka, jednaki/ručni razmaci, individualni redovi i fiksnost. Postojeće generatore/kopiranje koristiti kao osnovu, ne tvrditi da su isti algoritam. |
| Materijali i kantovi | Osnovni 11:07–12:37; Editor 04:39–05:04, 08:00–08:52 | Materijal mora imati jasan obuhvat i cilj; kantovi dijagram četiri ivice. Veza ivica i orijentacije još zahtijeva dokaz. |
| Bušenje i makroi | Editor 09:49–10:34 | Žičani pregled, lista po pločama, parametri, strane 0–5 i izvor rupa. Postojeća parsiranja i dijagnostika pomažu, ali puna semantika spajanja nije potvrđena. |
| Prihvatanje i čuvanje | Editor 10:34–10:59; Osnovni 14:29–15:01 | Razlikovati privremenu izmjenu editora, primjenu na projekat, čuvanje radne kopije i izvoz novog E3D. Obuhvat masovne primjene mora biti vidljiv. |
| Potrošnja / CSV | Osnovni 08:22–09:19 i 12:37–13:14 | Ploče, trake, okovi, količine i obrade sa tragom do izvora. Ugrađeni optimizator nije prioritet; naš proizvodni CSV jeste. |
| Tehnički pogledi | Osnovni 09:20–10:29; 13:30 | Kote i više pogleda imaju vrijednost; loš štamparski predložak iz videa nije cilj. Postojeći nacrt treba porediti kao odvojen tok. |

## Dodatni vizuelni nalazi iz prvog snimka

- Glavni meniji na kadrovima su Projekt, Uređivanje, Izgled, Umetanje, Odabir, Kalkulacije, Meta Report, Export, Pomoć, Jezik, Kamera. To nije zahtjev da implementiramo svaki meni ili zadržimo miješan jezik.
- Umetanje u 11:04 pokazuje Novi Element (Alt+E), Gotovi element, Ugradbeni element, Radna ploha (Alt+R), Zidna lajsna (Alt+Z), Stropna ploha (Alt+S), Top kolone (Alt+T), Podna ploha (Alt+P), Cokla (Alt+C), Leđna maska (Alt+L). Nazivi/prečice su dokaz postojećeg programa, ne automatska odluka o našim prečicama.
- Upozorenje u 01:00 nudi zamjenu nepoznatog potrošnog materijala, generisanje novog i uklanjanje, uz Primijeni na sve iste / Primijeni na sve. To su različiti obuhvati; ne svesti na jedan nekontrolisan klik.
- Utrošeni materijal u 08:30 odvaja Materials, Edgebands i Fittings. Materijali imaju debljinu/površinu, rubne trake dužinu, okovi količinu/cijenu. Elementi je poseban tab. Postoje Sve/Odabrano i više izlaznih komandi.
- Exportform u 13:00 pokazuje profil Maretta i kolone za dužinu, širinu, četiri ruba, god, količinu, šifru/naziv materijala, elementa i daske, program i primjedbu. Neke oznake su odrezane. **Ovo nije dovoljna specifikacija CSV formata**: traži se stvaran izlazni fajl da se potvrde redoslijed, separator, jedinice, kodiranje i rubovi.
- Završni tooltipovi potvrđuju različite komande za tačke/presjek/putanju. U 15:56 piše Pokaži točke presjeka; u 16:08 Obriši putanju (Alt+D). Ne poistovjećivati to sa korisnikovim pomenom Ctrl+D dupliranja.
- Na snimku selekcija pokazuje lokalne XYZ strelice. To odgovara već traženoj popravci našeg programa.

## Evidencija kvarova i nelogičnosti

Ovo je lista za istraživanje i naše kriterijume kvaliteta. Nijedna stavka nije proglašena potpuno reprodukovanim Corpus bugom samo iz jednog kadra.

| ID | Izvor | Opaženo / primjedba | Očekivano kod nas | Status |
|---|---|---|---|---|
| B-01 | Osnovni 15:39–15:47; Editor 03:07–03:32 | Primjedbe na Undo; ploča vidljivo odlazi van korpusa i zatim se vraća kroz više radnji. | Jedna potvrđena izmjena vraća izraz, rezultat, geometriju i povezane obrade jednim Undo; Redo ponavlja isto. | Govor + rezultat potvrđeni, tačan ulaz još rekonstruisati. |
| B-02 | Editor 02:12–02:37 | Katalog varijabli/funkcija pravi sloj prozora iznad aktivnog izraza; korisnik govori o logičkom problemu. | Izraz i izbor ostaju vidljivi; pomoć ne gubi fokus ili tekst. | Tok potvrđen, tačan kvar fokusa nepoznat. |
| B-03 | Editor 08:52–09:49 | Korisnik uđe u krivulje/prikaz tačaka i teško se vraća; model privremeno nije vidljiv. | Jasno označen režim i povratak na prethodni pogled/izbor; Escape izlazi bez gubitka. | UX problem potvrđen; deadlock/pad nisu dokazani. |
| B-04 | Editor 00:24–01:49, 07:04–07:16 | Mijenjanje širine panela, mali viewport, dijalog dodavanja pokriva model. | Podesivi split paneli i pregled rezultata bez gubitka aktivnog dijela. | Opservacija rasporeda; način pojednostavljenja dolazi kasnije. |
| B-05 | Osnovni 00:29–01:36 | Uzastopna upozorenja za kataloške reference pri učitavanju. | Sačuvati podatke i jasan obuhvat odluke; omogućiti povratak bez tihog izbacivanja. | Koristan tok sa potencijalno previše koraka; ne uklanjati zamjenu. |
| B-06 | Editor 10:34–10:59 | Razlika između ovog elementa i primjene na više elemenata nije dovoljno jasna iz snimka. | Vidljiv skup ciljeva i pregled posljedica prije grupne primjene. | Korisnikov naglasak potvrđen, Corpus semantika otvorena. |
| B-07 | Osnovni 02:05–02:34; Editor 01:20–01:49 | Riječ sakrij koristi se u različitim kontekstima. | Odvojiti vidljivost u editoru, vidljivost u sobi i uključenost u proizvodnju/štampu. | Kritična semantička provjera, ne tretirati kao jedan boolean. |

## Šta zadržati, šta istražiti, šta kasnije mijenjati

**Zadržati kao osnovu:** poznat raspored, tabove i kontekstualne alatke, stablo, direktnu selekciju, broj + formulu, varijable, biblioteku i E3D ponovnu upotrebu, raspored dijelova, materijale/kantove, obrade, pregled potrošnje i CSV.

**Istražiti prije odluke:** PD, tip/smjer ploče i posebni materijal, collision flags, svaka strana 0–5, CONNECT i izvor operacija, fiksna polica/tehnologija, import/export/reset varijabli, opseg primjene, krivulje/hvatišta, skripte i dodaci. Nejasno ne znači nepotrebno.

**Kandidati za kasniju doradu:** nepotrebni slojevi modala, ponavljanje iste informacije u više prozora, odrezana polja, previše koraka za čestu radnju, slab opis režima i nejasne ikone. To su kandidati, ne već odobrena brisanja komandi.

**Van sadašnjeg ciklusa:** nadmetanje sa svim novim Corpus addonima, potpuno nova tema/flow i implementacija svakog dobavljačkog taba. Prisustvo taba ne dokazuje ni sadržaj ni potrebu. Za istraživanje addona kasnije uzeti tačan proizvod i konkretan posao koji rješava.

## Redoslijed izvedbe i kriterijumi završetka ciklusa

### 1. Editor kao radno okruženje

- [ ] Gornji osnovni tabovi i kontekstualna traka; nepodržane radnje jasno označene, bez lažnih aktivnih dugmadi.
- [ ] Canvas + podesivo stablo/svojstva desno + stalni donji kontekst ploče, usklađeno sa kadrom 01:45.
- [ ] Isti dio izabran u stablu i sceni; privremeno skrivanje fronti ne mijenja proizvodnju.
- [ ] Jasno Prihvati/Odustani i definisana granica sesije editora.

### 2. Jedna potpuna parametarska izmjena

- [ ] Prikaz i unos broja/izraza sa izračunatim rezultatom i greškom, bez tihog prepisivanja.
- [ ] Primjer X = lijevi_bok.debljina, izmjena i Undo/Redo kroz povezanu geometriju.
- [ ] Varijable i njihove zavisnosti; dodavanje/brisanje/import tek kada su dokazane posljedice.
- [ ] Kružna ili nepoznata referenca ima jasnu poruku; ne ruši i ne blokira editor.

### 3. Konstrukcija i proizvodne posljedice

- [ ] Police/pregrade sa brojem, uvlačenjem, debljinom i rasporedom; promjena širine/visine ponovo računa raspored.
- [ ] Materijali i četiri ruba, sa dokazanim mapiranjem ivica.
- [ ] Jedan potvrđen spoj i makro kroz sve relevantne orijentacije; pregled rupa i potrošnje.
- [ ] Potvrđen obuhvat grupne primjene sa jednim Undo.

### 4. Zatvoren praktičan tok

- [ ] Element iz biblioteke → editor → izmjena → prihvati → soba → novi E3D → ponovo učitaj.
- [ ] Dimenzije, formule, materijali, kantovi, obrade i nepoznati zapisi prežive čuvanje/učitavanje.
- [ ] Krojna lista/CSV provjereni stvarnim uzorkom prema postojećem optimizatoru.
- [ ] Korisnička proba po istom primjeru kao u snimku; zatim spisak ciljnih pojednostavljenja.

Tek završen praktičan tok i korisnička potvrda znače kraj ovog ciklusa. Današnji pregled snimaka je završena analiza i osnova za rad, a ne tvrdnja da je ovaj ciklus već implementiran.
