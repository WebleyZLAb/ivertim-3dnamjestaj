# Corpus katalog materijala i teksture

Ova nota opisuje samo ponašanje potvrđeno nad lokalnom, read-only kopijom Corpus podataka. Privatni
`MatDat.MXC`, `MatDat.K3X`, slike, S3D i E3D fajlovi ne ulaze u repo.

## Potvrđena struktura

Corpus `elmtex` podfolderi sadrže tekstualne `MatDat.MXC`/`MatDat.K3X` kataloge. Zaglavlje sadrži
`VER`, `MATCOUNT` i `ORDER`, a svaki `<MAT> ... <ENDMAT>` zapis između ostalog može imati:

- `NAZIV` — naziv materijala;
- `MUID` — identitet kojim S3D/E3D ploča referencira materijal;
- `PICFILE` — slika relativna prema folderu kataloga;
- `TEXX`, `TEXY`, `TEXZ` — tri Corpus dimenzije teksture;
- `TIPMAT` i dodatna svojstva renderovanja.

Parser čuva sva polja i ponovljene vrijednosti, uključujući ona koja aplikacija još ne tumači.
`PICFILE` se prihvata samo kao relativna putanja podržane slike koja ne izlazi iz izabranog foldera.

## Audit stvarnih podataka

Komanda:

```powershell
pnpm audit:materials "PUTANJA_DO_S3D_ILI_E3D" "PUTANJA_DO_ELMTEX"
```

Read-only audit nad lokalnim `sobasav` projektima i `elmtex` kopijom 2026-10-21 dao je:

- 41 katalog, svih 41 parsirano bez greške;
- 1.761 kataloški zapis, bez upozorenja o deklarisanom broju;
- 30 S3D/E3D dokumenata i 7.159 ploča, bez greške parsera;
- 6.058 ploča ima jedan tačan `MUID` pogodak;
- sve 6.058 razriješenih slika postoji i ima bezbjednu relativnu putanju;
- 4 ploče imaju dvosmislen UID (`Gorenje EC 605 ASC`) i ne biraju se automatski;
- 1.097 ploča nema pogodak u kopiranom katalogu.

Na praktičnom `D1V.E3D` testu svih 27 ploča dobilo je jednoznačnu lokalnu teksturu. Izvorni E3D
ostao je neizmijenjen.

U praktičnom `sinisa bulic.S3D` testu svih 213 ploča dobilo je tačan pogodak. Ekran podataka je za
izabranu ploču `FRD` prikazao lokalnu sliku materijala `7045`, isti UID i kataloške dimenzije
`600 / 900 / 2000 mm`, dok je izvorni projekat ostao read-only.

## Pravilo prikaza

3D prikaz koristi sliku samo kada postoji tačno jedan, case-insensitive `MUID` pogodak i odgovarajući
lokalni fajl. Pogodak samo po `NAZIV` ostaje dokaz za pregled/audit i ne uključuje teksturu. Time se
ne prikazuje pogrešan dekor kada su naziv ili UID ponovljeni.

Object URL-ovi nastaju samo u pregledniku za trenutno prikazane materijale, a pri ponovnoj izgradnji
scene se ukidaju i Three.js teksture se oslobađaju.

## Namjerno nerazriješeno

`TEXX/TEXY/TEXZ` su potvrđene kataloške vrijednosti, ali njihovo preslikavanje na UV ose za sva tri
`SMJER` režima i proizvoljne konture još nije dokazano. Zato aplikacija trenutno prikazuje jednu
sliku preko postojeće geometrije, bez izmišljanja realne skale, ponavljanja ili rotacije dekora.
Ta semantika se smije uključiti tek nakon korelacije sa stvarnim Corpus prikazom ili drugim jakim
dokazom.
