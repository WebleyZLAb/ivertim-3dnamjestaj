# Corpus Editor materijala — pregled i potreba u Ivertim 3D

Datum: 25.10.2026. Pregledani su stvarni MatDat katalozi, MaterialImport.Template, lokalni prevodi i svih 15 ugrađenih DFM definicija obrazaca iz instaliranog MaterialEditor.exe. Svaka DFM definicija pročitana je do kraja, bez greške. Prozor programa nije bio dostupan Computer Use alatu ni nakon korisnikovog ručnog otvaranja i ponovnog povezivanja; zato ovo nije izvještaj o završenom vizuelnom klikanju kroz program.

## Od slike do dekora

Da, ovaj program omogućava da postojeća slika postane uzorak kataloškog materijala: definišu se grupa i materijal, povezuje slika, podešavaju njene dimenzije i smjer goda i čuvaju podaci. Ugrađeni dijalog prima BMP, JPG, TGA i PNG. Tu su komande Dodaj materijal, Dodaj sve, pregled cijele slike, premještanje, uvoz i izvoz.

Iz toga ne slijedi da program automatski pravi novu teksturu, uklanja perspektivu fotografije ili proizvodi bešavni uzorak. Takva obrada nije dokazana ovim pregledom. Potvrđeno je povezivanje slike i kataloških svojstava.

## Potvrđene cjeline

| Cjelina | Podaci i komande iz ugrađenih obrazaca |
|---|---|
| Grupe i materijali | Nova/preimenovanje/brisanje grupe, dodavanje/preimenovanje/brisanje/premještanje materijala, redoslijed grupa |
| Identitet | Naziv i ID/UID materijala, aktivno stanje, korisnička šifra, proizvođač, dobavljač, EAN i dodatna polja |
| Slika i god | Slika uzorka, njene X/Y dimenzije, horizontalni/vertikalni smjer i da li je god bitan |
| Tabla i obračun | Širina/dužina, dimenzijske stavke i cijene, obračun po m²/m³/dužnom metru/komadu |
| Prikaz | Prozirnost, refleksija, ambient/diffuse/specular/emission, shininess, normal mapa i LuxRender materijal |
| Optimizacija | Obrezivanje, dodatni parametri reza, cilj iskorištenja/vrijeme, pravilo prodaje i prvi horizontalni rez |
| Uvoz/izvoz | Odabrani ili svi materijali grupe; poseban uvozni obrazac i čuvanje uvoznog šablona |
| Integritet | Ponovni test, prikaz problema i promjena neispravnih UID-ova uz izbor foldera čije UID-ove treba zadržati |

To su prisutne kontrole i sačuvana polja. Algoritam optimizacije, konkretni efekti svakog render parametra i posljedice promjene UID-a nisu izvršno provjereni.

## Veza s našim kopiranim podacima

Materijal nije samo JPG. Potrebni su stabilni identitet i metapodaci:

- NAZIV/MUID/SIFRA/PICFILE za identitet i sliku;
- TEXX/TEXY/TEXZ, GOD/ROTGOD/ROT0GOD za uzorak i god;
- DEB, SIRINA, DUZINA i cijene za nabavku i obračun;
- TIPMAT, TIPIZRACUNA, AKTIVAN, FULLNAME, PRODUCER, DOBAVLJAC, KORISIF i EAN;
- kategorije cijene, mašinske i površinske obrade;
- posebna render i optimizaciona polja.

Naš postojeći parser čuva sva izvorna polja, uključujući ona koja trenutno ne prikazujemo. Slike se u 3D prostoru automatski vezuju samo po jednoznačnom UID-u. U katalogu trenutno postoje dvosmisleni UID-ovi; alat za njihovo preimenovanje mora uzeti u obzir reference iz E3D/S3D i kant traka, a ne samo napraviti novi broj.

`config/MaterialImport.Template` već mapira spreadsheet kolone na UID, naziv, sliku, folder, šifru, debljinu, cijenu, širinu/dužinu, dimenzije teksture, aktivnost i dobavljačke podatke. `TrakeImport.Template` sadrži posebno mapiranje dekor/dekor UID i fiksni dekor trake. Ovo je konkretna osnova za budući masovni uvoz.

## Šta nam treba prvo

Za Ivertim 3D ima smisla napraviti vlastiti jednostavan urednik kataloga: grupa → novi materijal → slika → naziv/šifra/stabilni UID → dimenzije/god/debljine → snimi u našu lokalnu biblioteku. Treba dodati vezu dekora i dostupnih kant traka i ponovni uvoz bez gubitka postojećih referenci.

Prvi dio treba čuvati izvorna nepoznata polja i podržati siguran izvoz/ponovno učitavanje. Sljedeći mogu biti masovni uvoz i uređivanje nabavnih dimenzija/cijena. Napredne render opcije i optimizacioni parametri dolaze tek uz potvrđenu potrebu i značenje u našem programu.

Ovim zadatkom urađeni su prenos i analiza. Pun novi editor kataloga, automatska obrada fotografija i izvršavanje originalnog EXE-a unutar Ivertim 3D nisu implementirani.

## Dokazi i ponavljanje

Ugrađeni obrasci: glavni Form1 (77 kontrola s opisnim svojstvima), uvoz, integritet, dodatni podaci, svojstva prikaza, optimizacija, cijene, pregled slike i pomoćni dijalozi. Izvorni EXE nije mijenjan niti kopiran u distribuciju našeg programa. Izdvojene definicije ostaju u ignorisanoj lokalnoj arhivi.

Skripte `extract-material-editor-resources.py` i `decode-material-editor-forms.py` čitaju PE RCDATA/DFM resurse, ne izvršavaju tijela funkcija. Rezultati: `.local-corpus-archive/analysis/material-editor-resources.json` i `material-editor-forms.json`.
