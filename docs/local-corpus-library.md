# Lokalni Corpus podaci

Korisnik je 25.10.2026. odobrio prenos svojih dekora, E3D elemenata i kant traka iz instaliranog Corpusa u Ivertim 3D.

## Uvoz

```powershell
npm run import:local-corpus -- "C:\CorpusSoftware64\CorpusSolutions"
npm run build
```

Skripta `scripts/import-local-corpus.ts` kopira cijele `elmtex` i `Elmsav` foldere, uz `Potrosni/05mm.cxm`, `1mm.cxm` i `2mm.cxm`, u `public/local-corpus/`. Izvorni fajlovi se ne mijenjaju. `manifest.json` sadrži kataloge, relativne putanje, izvorna polja i vezu trake s dekorom. Privatna kopija je ignorisana u Gitu; `dist/` je takođe ignorisan. Na drugom računaru treba prenijeti lokalni folder ili ponoviti uvoz iz tamošnje instalacije.

Program automatski učitava lokalni manifest. E3D tekst i slike učitavaju se po potrebi preko lokalnog servera, bez učitavanja cijele biblioteke u memoriju. Izbor drugog foldera kroz postojeće komande ostaje moguć.

## Rezultat prvog uvoza

- 86 kataloga, 3.353 zapisa materijala, bez upozorenja MATCOUNT.
- 5.176 E3D fajlova, sa izvornim folderima; uključene su i Corpusove arhivske/Rubbish podgrupe, bez automatskog brisanja ili spajanja duplikata.
- 154 kant trake: 26 × 0,5 mm, 93 × 1 mm, 35 × 2 mm.
- 10.858 kopiranih izvornih fajlova.
- 2.794 jednoznačno razriješene teksture, 266 dvosmislenih UID-a i 25 zapisa bez dostupne slike. Dvosmisleni zapisi ostaju u katalogu, bez automatskog izbora pogrešne slike.

## Upotreba

Biblioteka elemenata odmah prikazuje uvezene foldere. U editoru ploče, tab Materijali omogućava pretragu i izbor dekora pa Primijeni izgled. U Dodavanje → Rubna obrada dostupna je pretraga kant traka sa šifrom, izvornim nazivom, debljinom i širinom; postojeće potvrđivanje ivica koristi Primijeni rubove.

Kant katalog čuva izvorni `debljina` (500/1000/2000) i prikazuje ga kao 0,5/1/2 mm. `PotItem.Naziv` i `Dodatno.OznId` daju grupu i UID trake; `Data.MatName` daje MATN/MUID vezu dekora u E3D, potvrđenu nad stvarnim zapisima. `Sifra`, `Sirina`, `OffsetSirine`, `Cijena`, `Ima` i ostala polja ostaju sačuvana u lokalnom manifestu i izvornom CXM-u. Nulte cijene ostaju nule; ne računaju se nove cijene.

UI provjera: D1V dodat iz kopirane biblioteke u novi probni projekat, izabrana ploča Lijevi_bok; dekor 7045 primijenjen sa ispravnim UID-om, lokalnom slikom i TEXX/Y/Z vrijednostima. Za isti dekor pronađene trake 05_7045 i 1_7045, izabrana 1 mm i primijenjeni rubovi. Izvorni E3D nije mijenjan.

Provjera cjelovitosti: SHA-256 svih 10.858 kopija jednak je izvorniku; svih 5.176 E3D dokumenata parsirano je sa tačno jednim korijenskim elementom, bez greške. Lokalni izvještaj: public/local-corpus/import-verification.json. Build/typecheck i 230/230 testova prolaze.

## Proširenje prenosa — makroi, skripte i ostali podaci
Naknadno su preneseni cijeli Makro, skripte i Potrosni folderi u aktivnu lokalnu biblioteku, a veliki modeli i ostali podatkovni folderi u .local-corpus-archive. Ukupno 71.693 fajla; svi SHA-256 hash-evi potvrđeni. Umetanje → Makroi: 36 CMK + 1 CMK TXT; Umetanje → Skripte: 3 CPS, 9 TOC, 47 stavki bez dostupnog lokalnog CPS izvora. Objašnjenje i postupak za nove makroe: docs/corpus-macros-and-scripts-guide.md. Arhiva je ignorisana u Gitu i ne ulazi u build.
