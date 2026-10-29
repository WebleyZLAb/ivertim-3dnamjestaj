# Corpus makroi i skripte — vodič za Ivertim

Analiza lokalnih, korisnikovih podataka od 25.10.2026. Izvorna instalacija: `C:\CorpusSoftware64\CorpusSolutions`. Izvorni kod je čitan; Pascal skripte nisu pokretane.

## Šta je preneseno i gdje

`public/local-corpus/` sadrži cijele elmtex, Elmsav, Makro, skripte i Potrosni foldere. Makroi se automatski pojavljuju u Umetanje → Makroi. Umetanje → Skripte prikazuje dostupne CPS izvore i TOC menije, uz spisak nedostupnih izvora.

`.local-corpus-archive/` čuva preostale podatkovne foldere: Modeli, katalog, sobasav, config, system, export, Masine, MRP, OUtDoc, Template, Tool, UpdateInfo i Default.CPO. Tu su i veliki modeli, izvještaji i šabloni za dalju analizu; ti formati nisu ovim prenosom automatski postali funkcije našeg programa. Arhiva se ne kopira u svaki build i ne služi kroz web server. Aplikacioni paketi quickApp, quickFJ, RoomMaker i AnyDesk te glavni EXE/DLL programi nisu podatkovne biblioteke i nisu prenošeni.

Oba lokalna foldera ignorisana su u Gitu. Kopiranje ne mijenja original. Skripta `scripts/import-local-corpus.ts` ponavlja ovaj prenos; za ponovno generisanje analize koristi `node --experimental-strip-types scripts/audit-local-corpus-scripts.ts`.

## Tri različita sloja

| Format | Šta sadrži | Kako ga koristimo |
|---|---|---|
| CMK | Parametre i formule za spojeve, rasporede rupa, pilu i potrošni materijal | Čitamo sekcije, zavisnosti i podržanu simulaciju; za nove makroe možemo koristiti isti format |
| CPS | Programski kod u Pascal sintaksi, sa Corpus objektima | Izvor za razumijevanje ponašanja; naš program nema opšti Pascal/Corpus runtime |
| TOC | Registraciju dugmadi: naziv, Scfile, ikonu, opis i podrazumijevano stanje | Mapa komandi i njihovih izvora; sam TOC ne sadrži algoritam |

Pronađeno je 36 CMK fajlova i jedan `.cmk.txt` primjer. Dva CMK fajla su prazna: CABINEO_12.CMK i RAFIX.CMK. Prazan fajl ne daje implementaciju tog spoja. Svih 37 zapisa može se pročitati bez neprepoznatih linija, ali to ne dokazuje da simulator podržava svaku formulu ili obradu.

Dostupna su tri CPS izvora i devet TOC menija sa 47 stavki. Svih 47 `Scfile` putanja nema odgovarajući lokalni izvor u kopiranom skriptnom stablu. To uključuje dobavljačke komande BLUM, Hettich, HRANIPEX, GRASS, GTV, DTC i Corpus/Solutions alate. Imamo nazive, putanje i ikone; njihovo unutrašnje ponašanje ne može se zaključiti samo iz naziva. Nije utvrđeno da li ih Corpus dobavlja na zahtjev ili ih čuva drugdje.

## Dostupne Pascal skripte

### REcalc.cps

Tijelo poziva `e.recalcformula(e)`. To traži od Corpusovog trenutnog elementa `e` da ponovo izračuna formule. Sam fajl ne definiše taj mehanizam; on je dio Corpusovog API-ja.

### Show_hide.cps

Uključuje `show_hide_proc.cps`, poziva `Show_hide_proc`, pa `e.recalcformula(e)`. Zato promjena vidljivosti i preračunavanje konstrukcije čine jedan korisnički tok.

### Show_hide_proc.cps

Prolazi kroz varijable trenutnog elementa (`e.Fvarijable`), izračuna njihove vrijednosti i reaguje na dva prefiksa:

- `ShowD_ABC=0` sakriva direktnu ploču ili pod-element naziva ABC; vrijednost 1 ih prikazuje. Druge vrijednosti ne mijenjaju stanje u ovoj proceduri.
- `ShowC_pol=4` prolazi direktne ploče i pod-elemente naziva pol1, pol2… i prikazuje indekse do 4, a veće skriva.

Kod ne obilazi rekurzivno sve potomke. Poređenje naziva je tekstualno, a ime poslije prefiksa uzima se sa najviše 20 znakova. Numerički sufiks čita najviše dvije cifre. Komentar preporučuje vrijednosti 0–98, ali procedura ih ne ograničava. Ako sufiks nije broj, postavlja indeks -99, koji za uobičajenu pozitivnu vrijednost ostaje prikazan. Ovo treba svjesno definisati kada pravimo našu verziju.

U uvezenom D1V postoje varijable ShowD_Prednji_vezac, ShowD_Zadnji_vezac, ShowD_PLAFON i ShowD_Puna_ledja. One povezuju izbor tipa konstrukcije sa prikazom konkretnih ploča. To je važna veza između varijabli, skripte i konstrukcije; običan evaluator matematičkih izraza sam ne obavlja sve te korake.

## Vaši korisnički CMK makroi

### Korpusiranje / KORPUS UNIVERZALNI ISPRAVAK

Parametri biraju spoj, broj i raspored tipli, ekscentara, šrafova, konfirmata i lamela. Formule koriste dimenzije i orijentacije OBJ1/OBJ2 i raspon PMIN/PMAX. Pozicije i razmaci prilagođavaju se širini spoja, sa posebnim granama za uske komade. RASTER sekcije pretvaraju te rezultate u obrade; POTROSNI sekcije nose pripadajuće stavke.

Za prenos treba utvrditi sve spoljne varijable i povezane potrošne šifre. Ne pretpostavljati da dva slična naziva varijabli znače isto: u izvoru se pojavljuju, na primjer, inicijalizacija BRE i reference BER. Moguću zavisnost od konteksta treba provjeriti prije prepravke.

### Baglama / sarka / MAKRO HETTICH / X_PANTI

Sadrže raspored čašice i pratećih rupa, broj šarki, strane otvaranja i njihove korekcije. Konkretno X_PANTI ima čašicu prečnika 35 mm i dubine 14 mm, kao i zasebne prateće rastere. Broj može biti ručno zadat ili izračunat iz dimenzija. Granice 850/1100/1600 u formulama treba provjeriti i na samim graničnim vrijednostima, jer izvor koristi stroge uslove > i <.

### Ledja / LEDJA_FALC_NUT

Sekcija JOINT postavlja kontekst spoja, FORMULE računaju početak i kraj na osnovu EVAR parametara, a PILA daje liniju i dubinu falca/nuta. Izvor koristi EVAR.TIP_PODA, EVAR.T_P, EVAR.t_l i EVAR.DUBINA_FALCA_ILI_NUTA. Bez tih parametara i dokazane ravni obrade ne treba generisati proizvodni izlaz.

### PERFORACIJE_3_RUPE

Pravi dva rastera: jedan uz prednji, drugi uz zadnji dio, sa početnim BROJ_RUPA=3, odmacima 50 mm i rasterom 32 mm. U konkretnim sekcijama GF je upisan kao 5, GD kao 9 i GR kao 32. Parametri PRECNIK_RUPE i RAZMAK_IZMEDJU_RUPA učestvuju u izrazu za početni GX, ali GF i GR ostaju tvrdo upisani: promjena parametra ne mijenja automatski sva povezana polja. POTROSNI1 sadrži J=0. To se ne smije tumačiti kao isključivanje: sistemska pomoć za RASTER/GRUPA/PILA/MAKRO koristi J za izbor OBJ1/OBJ2, dok detaljna primjena na POTROSNI traži zasebnu provjeru.

### Ostali makroi

Tu su i jednostavniji primjeri za policu, tiplu, šrafove, bravicu i pilu. Za svaki makro lokalni izvještaj `public/local-corpus/script-analysis.json` navodi sekcije, broj zapisa i eventualne neprepoznate linije. Izvorne CMK fajlove ostavljamo netaknute kao reference.

## Kako pravimo nove

1. Opišemo željenu obradu na konkretnom komadu: ciljna ploča, strana, prečnik/dubina, broj rupa, razmaci, odmaci i potrebni okovi.
2. Izaberemo najbliži razumljiv CMK uzorak i napišemo novu kopiju sa sopstvenim nazivom. VARIJABLE su korisnički parametri; FORMULE su izvedene vrijednosti; RASTER/PILA/POTROSNI su izlazne radnje.
3. Zapišemo potrebni kontekst: OBJ1/OBJ2, orijentaciju i sve spoljne EVAR parametre. Nepoznate kodove ne preslikavamo napamet.
4. Provjerimo nekoliko dimenzija, ogledalnu orijentaciju, granične vrijednosti i slučajeve 0/1 rupa gdje račun razmaka može dijeliti nulom.
5. Uporedimo prikaz i proizvodnu listu, čuvanje/ponovno učitavanje i Undo. Tek potvrđene obrade idu u proizvodni tok.

Za nove proceduralne funkcije po uzoru na CPS prvo definišemo naš mali skup operacija nad elementom (vidljivost, parametri, ponovno računanje), pa implementiramo i testiramo taj mehanizam. Postojeći CPS izvori služe kao dokaz očekivanog ponašanja; direktno pokretanje Pascal koda nije dodano ovim zadatkom.

## Završna provjera prenosa
SHA-256 provjeren za svih 71.693 fajla (10.885.093.563 bajta), bez razlike prema izvorniku. Od toga je 11.122 u aktivnoj lokalnoj biblioteci, a 60.571 u arhivi pratećih podataka. Izvještaj: .local-corpus-archive/verification.json. UI potvrđuje 37 makroa i otvaranje VARIJABLE/RASTER/POTROSNI sekcija makroa PERFORACIJE_3_RUPE, kao i čitljiv Show_hide_proc.cps izvor. Build/typecheck i 232 testa prolaze.

Naknadno pronađena lokalna dokumentacija formula i makroa u system/LNG/Croatian/FormulaHelp.txt i MakroHlp.txt. Ona potvrđuje J=0 → OBJ1 i J=1 → OBJ2 za RASTER/GRUPA/PILA/MAKRO. Ranija tvrdnja o opštem isključivanju preko J=0 je ispravljena. Detalji: docs/corpus-support-folders-review.md.
