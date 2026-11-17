# Autonomni Corpus rad — primopredaja 30.10.2026.

## Rezultat

Izvorni S3D sada preračunava podržane izraze konstrukcije kada se promijeni postojeća varijabla. Obračun koristi cijeli korijenski element, roditeljske varijable i tačnu putanju podelementa. Promjena je atomska history radnja; zaključani preci, nedozvoljene dimenzije i nesačuvljiva model-only geometrija odbijaju se prije primjene.

Radna kopija **v11** dodaje `boardContourChanges`, uz čitanje verzija1–10. JSON oporavak čuva obnovljene ravne konture i odbija zastarjeli izvor, nevaljane tačke, nesaglasne mjere i samododir nesusjednih ivica.

Automatska obnova dokazanih pravougaonih kontura:

- Čuva izvorni redoslijed i indekse tačaka.
- Mijenja samo PTX/PTZ u izvornoj DATA vrijednosti; čuva ostale bajtove, CURVEDATA, atribute i djecu KRIVULJE.
- Radi i poslije modelskog postavljanja ploče kada dimenzija zavisi od njenog položaja.
- Ručno eksplicitno crtanje nove konture zadržava svoj postojeći režim.

## Provjereno

| Put | Dokaz |
|---|---|
| Puna regresija | **381/381**, posljednji `npm test`, helper `contour-repeat-cycle-tests.txt` |
| Build i tipovi | `npm run build` exit0, Vite14,07s; typecheck prolazi |
| S3D roditeljska/lokalna varijabla | Browser SHIFT40/LOCAL30 daje A.X70/H70, konturu70×80; Undo/Redo |
| Izvoz i ponovno učitavanje | Stvarni browser S3D download nezavisno parsiran, zatim ponovo učitan u editor |
| JSON i lokalni oporavak | Stvarni JSON import i novi tab→Vrati sesiju; izvoz iz obnovljene sesije čuva konturu i izraze |
| Položajem zavisna dimenzija | Browser pomakX40 daje X65/H140 i konturu140×80; Undo25/100, Redo, stvarni export |
| Odbijanje nulte dimenzije | Browser LOCAL100 odbijen uz prethodno X70/H70, bez nove history radnje |
| Stvarni D1V | TIP_PLAFONA1, tri obnovljene konture, sačuvano svih27 CURVEDATA i svi nekoordinatni bajtovi kontura, RUPE i EFRDATA |
| Višestruki ciklus | D1V ZAZOR_8→4→12→4, svaki put model→JSON→restore→XML→parse, bez gubitka istih podataka |
| Stvarni ugaoni element | WC_CORNER_45_L Sides_W640 prihvaćen; svih33 CURVEDATA i rupe sačuvani |

Svi browser eksperimenti koriste kontrolne helper fajlove, bez izmjene korisničkih projekata. Sirovi nalazi i downloadi ostaju lokalno van Gita. Detaljni razvojni trag: `docs/corpus-basic-cycle-audit.md`, dopune30.10.2026.

## Otvoreno — traži primarni Corpus dokaz

1. **D1V ZAZOR_8 u model-only S3D putu ostaje odbijen.** Skriveni PLAFON ima sačuvanu dužinu602, a njegova postojeća formula daje0 pri punom preračunavanju. Nova poruka imenuje PLAFON; izvorni model ostaje netaknut. Nije uveden nagađani izuzetak za skrivenu degenerate geometriju. D1V TIP_PLAFONA1 prolazi.
2. **CURVEDATA se čuva izvorno, ne regeneriše.** Testovi dokazuju očuvanje bajtova, ne značenje tog binarnog zapisa niti proizvodnu jednakost poslije promjene geometrije.
3. **Rupe/obrade se ne regenerišu.** Izvorni zapisi su sačuvani; njihova usklađenost sa promijenjenim konstrukcijskim mjerama traži stvarni proizvodni primjer. Fizičke plohe/rubovi, dinamički spojevi i Maretta ostaju nepotvrđeni.

## Sljedeći ulaz

Korisnikov video jednog stvarnog elementa, E3D/S3D prije i poslije i stvarni proizvodni izlaz. Povezati konkretan kadar sa promjenom varijabli, geometrije i izlaza, pa tek tada birati sljedeću semantičku izmjenu. Trenutno nema novog dokazanog nezavisnog nedostatka spremnog za popravku nakon završnog pregleda izmijenjenih tokova.

## Git i memorija

Rad je **necommitovan** na osnovi `dc4b4f3`; nema pusha ni deploya. Korisnik nije zatražio zatvaranje sesije. Novi fajlovi `lib/corpus-contour.ts`, `lib/corpus-element-variables.ts` i pripadajuće regresije moraju ući u budući pregled i commit zajedno sa izmjenama, jer ih obični `git diff --stat` bez untracked fajlova ne prikazuje.

Vault laptopa: `10-projects/ivertim/log/2026-10-30-autonomous-s3d-variables.md` i `context.md`, preko Obsidian Synca; bez Git komandi u vaultu.
