# Corpus padajući izbori varijabli — potvrđena veza

Datum: 25.10.2026. Korisnik pokazao da se varijabla IVERTIM=10 dodata u editoru pojavljuje kao brojčani red desno, dok TIP_SPAJANJA ima tekstualni izbor KONFIRMAT+TIPL.

## Tačan primjer iz lokalnih fajlova

Stvarno ime elementne varijable je `t_b`. Njena vrijednost na korisnikovom snimku je 2. U `config/varvalues.dat`, od reda 799, nalazi se:

```ini
[t_b]
CAPTION=TIP_SPAJANJA
CATEGORY=TEHNOLOGIJA
TIP=1
TIPLOVANJE=0
EKSCENTAR+TIPL=1
KONFIRMAT+TIPL=2
SRAF+TIPL=3
LAMELLO+TIPL=4
```

Naziv sekcije povezuje definiciju sa stvarnim imenom varijable. CAPTION daje naziv koji se vidi u desnom panelu; CATEGORY određuje grupu. Parovi naziv=broj daju tekstualne izbore, dok element i formule i dalje koriste broj.

Ne treba miješati TIP u ovom tekstualnom fajlu s numeričkim tipom kontrole u binarnoj EVarList Group strukturi. Komentari na početku varvalues.dat opisuju TIP kroz područje prikaza/vidljivost. Samo prisustvo IF formule ne stvara listu ponuđenih naziva.

`config/vvf.dat` navodi varvalues.dat kao jednu od uključenih definicija.

## Veza s makroom za bušenje

Obje korisničke varijante korpusiranja, `Makro/___ivertim makro/Korpusiranje.CMK` i `Makro/makro ivertim/KORPUS UNIVERZALNI ISPRAVAK.CMK`, u VARIJABLE sekciji sadrže:

```ini
_t_b=0
VARIJABLA=0
TIP_SPAJANJA=3
```

Izvedena formula je:

```text
IZBOR_VARIJABLE=IF(VARIJABLA=0;T_B;TIP_SPAJANJA)
```

Lokalni `system/LNG/Croatian/MakroHlp.txt` potvrđuje da makro varijabla koja počinje `_` prelazi u varijable elementa i da se u makrou koristi bez tog prefiksa. Zato `_t_b` povezuje bušački makro sa elementnom varijablom `t_b`. Izbor broja se dalje koristi u formulama broja i rasporeda obrada i potrošnog.

U istom makrou postoji i druga, obična makro varijabla `TIP_SPAJANJA`. Ona nije ista stvar kao CAPTION=TIP_SPAJANJA nad elementnom varijablom t_b. Ova dva naziva ne treba spojiti u jedno polje prilikom implementacije.

## Predložak za korisnikovu novu varijablu

Za postojeću probnu elementnu varijablu `IVERTIM=10` odgovarajući novi konfiguracioni blok mogao bi biti:

```ini
[IVERTIM]
CAPTION=Ivertim proba
CATEGORY=PROBA
TIP=1
PRVI IZBOR=10
DRUGI IZBOR=20
```

Tada bi očekivani prikaz broja 10 bio PRVI IZBOR, a promjena na DRUGI IZBOR čuvala bi broj 20. Ovo je predložak izveden iz potvrđenog postojećeg mehanizma; taj novi blok nije instaliran u originalni Corpus niti je njegova UI proba proglašena završenom. Prije primjene sačuvati kopiju varvalues.dat, provjeriti da sekcija nije duplirana i ponovo učitati konfiguraciju/otvoriti program prema njegovom ponašanju.

## Zaključak za naš program

Čuvati odvojeno: stvarno ime, izraz/broj, prikazani naziv, kategoriju i tabelu labela→vrijednost. Makro može dodati elementnu varijablu; config može dati njen prikaz i izbore. Brojčana ili IF vrijednost sama ne daje nazive opcija. Prethodno dodata IVERTIM=10 upravo potvrđuje običan unos bez registrovane liste.

Originalni Corpus podaci nisu mijenjani u ovom istraživanju.

## Padajuće liste u Ivertim editoru — 25.10.2026.

Uvoz sada učitava samo definicije uključene u config/vvf.dat (187), uz caption, kategoriju, izvor i opcije. Osvježavanje bez ponovnog kopiranja biblioteke: `node --experimental-strip-types scripts/refresh-corpus-variable-definitions.ts`. Puni import uključuje isti loader. Manifest drži optional variableDefinitions, pa starije biblioteke nastavljaju raditi kao ranije.

Editor prikazuje izbor uz izvorni naziv i sirovi izraz. t_b=2 prikazuje TEHNOLOGIJA / TIP_SPAJANJA / KONFIRMAT+TIPL. Nepoznate varijable ostaju unos. TIP/NOEDIT/color su metapodaci, nisu opcije; režim izvornog editora ne zaključava na osnovu NOEDIT namijenjenog završnom prozoru. Konfliktne definicije imaju običan unos. Samo literalni brojevi se podudaraju s opcijama; formule se ne preračunavaju u izbor niti prepisuju bez eksplicitnog izbora. Redoslijed i imena EVAR ostaju izvorni.

Provjereno: 244 testa, TypeScript i Vite build prolaze. Novi testovi pokrivaju metapodatke, konflikte, formule i E3D zapis/čitanje/vraćanje prethodnih vrijednosti. U browseru stvarni D1V.E3D: KONFIRMAT+TIPL (2) → TIPLOVANJE (0), Sačuvaj varijable, Undo → 2. Screenshot dropdown-tip-spajanja.png u radnom folderu razgovora. Prihvati izmjene radi. Browser download provjera je istekla bez potvrđenog preuzimanja, zato taj dio nije označen kao završen. Geometrija/bušenje se još ne regenerišu promjenom varijable.

## Prva primjena varijabli na model — ShowD vidljivost

Pri čuvanju varijabli strukturnog E3D elementa, nakon EVAR upisa se evaluiraju vlastite varijable svakog elementa i njegove eksplicitne ShowD_<ime> kontrole za direktne ploče/pod-elemente. Nazivi se porede bez razlike u veličini slova; dvosmisleni nazivi objekata se ne mijenjaju. Prihvaćene su samo boolean i numeričke 0/1 vrijednosti. Nerazriješeni/ciklični izrazi i ostale vrijednosti zadržavaju sačuvani prikaz. Nema nasljeđivanja varijabli od roditelja ni nagađanja imena. Izvorne formule, mjere, konture i rupe ostaju sačuvane. Postojeći strukturni zapis i Undo obuhvataju varijable i prikaz u jednoj promjeni.

Provjera stvarnog D1V: TIP_PLAFONA=1 prikazuje PLAFON, skriva Prednji_vezac i Zadnji_vezac; VIDLJIVOST_NOGICA=1 skriva sva četiri Nogica pod-elementa (potvrđen zapis/ponovno čitanje). Browser potvrđuje prikaz TOP i skrivanje veznika; Undo vraća VEZACI, prethodni prikaz i VIDLJIVOST_NOGICA=0. Screenshot: variable-visibility-top.png u folderu razgovora. Ukupno 248 testova + typecheck/build prolaze.

Ovo je prvi završen dio primjene na model. XF/YF/ZF/HF/SF/DF i KXF/KYF/KZF nisu još povezani s računanjem mjera/položaja/uglova; potrebni su lanac zavisnosti među pločama, self i AABB reference. t_b još ne regeneriše bušenje. Originalni S3D put ostaje samo upis vrijednosti; ovo povezivanje je za strukturni E3D put. Raniji browser download timeout ostaje otvoren.

## Trenutni prikaz, izbor fronti i oznake osa

Promjena postojeće vrijednosti u editoru sada odmah poziva upis/preračunavanje bez dugmeta Sačuvaj. Nazivi/dodavanje/uklanjanje ostaju strukturno potvrđivanje dugmetom. Undo ostaje u postojećoj sesiji editora.

Dodato lib/corpus-parametric.ts. Parser ploče izlaže izvorne XF/YF/ZF/HF/SF/DF/KXF/KYF/KZF formule. Računanje direktnih ploča E3D korijena rješava varijable, reference po imenu, self i nerotirane AABB granice. Izračunati ciljevi se ne inicijalizuju starim vrijednostima, da ciklusi ne bi izgledali riješeni. Nerazriješeni izrazi zadržavaju prethodnu geometriju. Corpus AABB Z koristi izvorne koordinate, ne Three.js inverziju. Pravougaone konture od četiri ravna ugla obnavljaju se prema mjerama s tolerancijom 0.001 mm za izvorni float zapis. Ostale konture, rotirane AABB reference, geometrija pod-elemenata i generisanje bušenja još nisu riješeni ovim korakom. S3D put je i dalje samo upis varijabli. Ne tvrditi da svaka proizvoljna Corpus formula radi.

Room3D klik na bilo koji pod-element bira njegov korijenski korpus. Označavanje korpusa bojom uključuje sve potomke, pa i fronte/ručkice; u editoru se zadržava odabir ploča. Oznake osa imaju transparentan canvas, bez bijelog pravougaonika i bez 0.

Browser stvarni D1V: bez klika Sačuvaj, TIP_LEDJA NUT → NAKUCAVANJE mijenja Z -523 → -563 i širinu 580 → 596, Undo vraća obje mjere/izbor. Klik na frontu u osnovnom prozoru bira D1V i oboji cijeli korpus s frontom. Screenshot selection-fronts-xyz.png u folderu razgovora. 253 testa + typecheck/build prolaze. Izvorni Corpus nije mijenjan.
