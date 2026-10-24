# Corpus — vodič kroz osnovni snimak

Izvor: lokalni `recordings/Osnovno snimanje.mp4`, trajanje 16:20, pregled 2026-10-24.
Govor je obrađen lokalnim modelom faster-whisper small (hr), a sažetak upoređen s izdvojenim kadrovima. Ovo je tematski indeks, ne doslovan transkript. Nazivi nekih komandi i završno objašnjenje nisu pouzdano prepoznati; za njih otvoriti navedeni dio. Sirovi transkript ostaje uz lokalni snimak i ne ulazi u Git.

## Korisnikovi naglasci

- Najvažnije su varijable: korisnik želi razumjeti njihovo dodavanje i povezivanje sa konstrukcijom, obradama i automatskim rasporedom. Detaljan editor biće zaseban snimak; ovaj snimak nije njegova specifikacija.
- Sakriven element ostaje u projektu, ali korisnik objašnjava da ne ulazi u liste, štampu i izvoz. Ne poistovjećivati ovu semantiku sa pukim skrivanjem u 3D prikazu; ponašanje provjeriti za svaku komandu i izlaz.
- Biblioteka koristi korisnikovu strukturu foldera Elmsav. Za izbor elementa korisnik preferira prozor sa stablom i velikim pregledom, uz mjere prije ubacivanja, u odnosu na prikaz sa malim ikonama foldera.
- Čuvanje prerađenog elementa kao novog E3D u biblioteku je veoma važno za ponovnu upotrebu.
- Postojeći raspored glavnog Corpus okruženja korisniku uglavnom odgovara. Mnogo opcija ne poznaje; samo pokazivanje komande ne znači zahtjev da se implementira.
- Ugrađena optimizacija u ovom snimku nije trenutni prioritet. CSV izvoz za postojeći proizvodni tok / naš optimizator jeste važan.

## Vremenski indeks

| Vrijeme | Tema i značenje | Kada ponovo otvoriti |
|---|---|---|
| 00:02–00:29 | Loader, provjera ažurnosti, novi/učitaj/odustani i nedavni projekti. Loader i nedavni projekti se sviđaju korisniku; stalni popup nije nužan. | Početni ekran i otvaranje projekata. |
| 00:29–01:36 | Otvaranje projekta i upozorenje na nedostajući materijal/okov; izbor zamjene i primjena na više stavki. Korisnik pokazuje postojeće ponašanje. | Obrada nedostajućih kataloških referenci. |
| 01:36–02:01 | Želi dvije do tri teme; pregledi sa sakrivenim aparatima, frontama, donjim ili visećim elementima. | Teme i grupni prikazi. |
| 02:05–02:34 | Stablo, nazivi i skrivanje. Izričito objašnjava izostavljanje sakrivenog elementa iz štampe/lista/izvoza bez brisanja. | Vidljivost i uključenost u proizvodnju; obavezno provjeriti. |
| 02:35–03:54 | Kratak ulazak u editor, izbor dijelova/fronti, kantovi, varijable i skripte/broj šarki. Dubinski pregled odlaže za kasnije. | Orijentacija u editoru; ne zaključivati njegov puni obim. |
| 03:54–04:55 | Soba, svjetla i dimenzije; mnoge funkcije u ikonama; dodavanje ručkica i pregled biblioteke. | Raspored panela i biblioteka dodataka. |
| 04:55–05:27 | Vlastita biblioteka Elmsav: foldere pravi u Exploreru i u njih smješta elemente; isti raspored je dostupan u programu. | Učitavanje i organizacija lokalne biblioteke. |
| 05:27–05:51 | Ubacivanje/pomjeranje i Alt za prolazak kroz zidove ili prepreke. | Detaljno provjeriti Alt i ograničenja pomjeranja. |
| 05:51–06:20 | Podaci elementa: naziv/šifra, količina, mjere, položaj, ugao, opis/napomena. Pominje i nepraktičnosti postojećeg interfejsa. | Panel svojstava i izbor elementa. |
| 06:20–07:06 | Varijable su najbitnije. Leđa: nut, falc, puna i bez leđa; uvlaka, dubina obrade i umanjenje radi zazora pri sklapanju. | Glavni dokaz za parametarsku konstrukciju i naknadni snimak editora. |
| 07:07–07:30 | Zazori fronti i tehnologija spajanja/bušenja: tipl, ekscentar, konfirmat i druge opcije. | Pravila fronti i spojeva; nazive provjeriti na ekranu. |
| 07:31–08:21 | Biblioteke okova, zidne instalacije, prikazi bušenja/providnosti i različite boje kantova. | Vizuelna provjera obrade i razvrstavanje kantova. |
| 08:22–09:19 | Utrošeni materijal, ploče, trake, okovi, krojna lista i ugrađena optimizacija. Izričito kaže da se optimizacijom sada ne moramo baviti. | Proizvodne liste; optimizaciju ne proglašavati prioritetom. |
| 09:20–10:29 | Prikazi za slike i tehnička dokumentacija sa kotama. Korisnik otkriva opcije i pozitivno reaguje na automatsko kotiranje. | Posebno istražiti tehničke poglede i kote; nije potvrđena puna specifikacija. |
| 10:30–11:05 | Meniji i komande pomjeranja; kaže da dio tih radnji već radi mišem. | Razlikovati korisne prečice od pokazivanja nepoznatih opcija. |
| 11:07–12:37 | Kalkulacije: katalog, novi materijal/debljina, dimenzije ploče, kant trake i njihova veza s dekorom. | Detaljno pregledati model kataloga i povezivanje traka. |
| 12:37–13:14 | Priprema izvoza za Marettu / naš optimizator, podešavanje kolona i CSV. Pominje i oznake programa bušenja. | Otvoriti ekran i provjeriti stvarne kolone i značenje polja; transkript ne dokazuje CSV šemu. |
| 13:20–13:44 | Srpski jezik, izbor pogleda; perspektivu najčešće koristi. | Lokalizacija i glavni 3D pogled. |
| 13:45–14:28 | Drugi način učitavanja: stablo biblioteke, veći pregled, mjere i rotiranje pregleda. Korisnik kaže da mu je ovaj unos bolji od folderskog prikaza. | Preferirani tok ubacivanja elemenata. |
| 14:29–15:01 | Izmijeni postojeći element, sačuvaj novi E3D u biblioteku i koristi dalje. Varijable, police i automatski raspored biće objašnjeni u editoru. | Ponovna upotreba i čuvanje elemenata. |
| 15:01–15:37 | Štampa/predlošci i slika. Prikazani pokušaj predloška korisnik ocjenjuje kao loš; ne kopirati ga kao željeni rezultat. | Izrada vlastitih predložaka i dokumentacije. |
| 15:39–16:20 | Pominje problem s Undo i Ctrl+D dupliranje; prolazi preko kota, vezivanja za tačke, presjeka, polilinije i offseta. Traži istraživanje nepoznatih komandi; tačne nazive provjeriti. Završava najavom posebnog snimka editora. | Ciljana istraga završne palete i provjera prečica, bez pretpostavljanja pune funkcionalnosti. |

## Kako koristiti

Prvo naći temu u ovoj tabeli, zatim otvoriti navedeni interval sa nekoliko sekundi prije i poslije. Za geometriju, skripte, obrade i zavisnosti varijabli koristiti novi vodič `corpus-editor-recording-guide.md`. Ovaj pregled ne predstavlja odobrenje za implementaciju svih prikazanih Corpus funkcija.

## Dopuna — drugi snimak pregledan 2026-10-24.

Detaljan snimak editora je sada dostupan i obrađen: [vodič editora](corpus-editor-recording-guide.md). Zajednički tok, inventar rasporeda, problemi i kriterijumi izvedbe: [mapa rada](corpus-workflow-map.md). Ranije napomene da se čeka editor odnose se na stanje pri prvom pregledu. Prvi snimak ponovo je vizuelno pregledan kroz cijelo trajanje sa gušćim kadrovima menija, biblioteke i završnih komandi; precizniji nalazi su u zajedničkoj mapi. Lokalno su dodati TXT i SRT transkripti.

