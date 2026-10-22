# Corpus PILA operacije — read-only dokaz

Ovaj dokument razdvaja ono što je izmjereno u lokalnim Corpus podacima od onoga što još nije dokazano. Audit ne izvršava CMK sadržaj i ne mijenja S3D/E3D/CMK fajlove.

## Komande

```powershell
pnpm audit:cmk:saw "PUTANJA_DO_MAKRO_FOLDERA"
pnpm audit:s3d:saw "PUTANJA_DO_S3D_ILI_E3D_FOLDERA"
```

## Izmjereno 21.10.2026.

| Izvor | Fajlova | PILA zapisa | Greške čitanja/dekodiranja |
|---|---:|---:|---:|
| CMK biblioteka | 32 (30 nepraznih) | 3 | 0 |
| Kopije stvarnih S3D projekata | 30 | 109 | 0 |
| E3D biblioteka | 2.671 | 51 | 0 |

Svih 163 zapisa imaju osnovni potpis `J, GB, GN, GD, GX, GY, PX, PY, GS, PSP, PO, PS, PP, PA`. Jedan S3D zapis dodatno ima `PMU` i `PMT` uz naziv `Konvert_pila_u_glodalo` i alat `110`.

U podacima su nađene tri porodice:

- `FALC_NUT`/`Ledja`: linija za leđa, sa `PSP` 4 ili 4,2 i formulom dubine iz varijable elementa;
- `TANDEM_nut`: dvije uslovne linije, sa širinom iz `sirina_pile`;
- `Nutanje_ledja`: jedan primjer sa `PMU/PMT` konverzijom pile u glodalo.

## Šta aplikacija sada smije tvrditi

- `GX/GY` i `PX/PY` čine početni i krajnji par lokalne PILA putanje jer su tako dosljedno zapisani u svim izmjerenim porodicama.
- `GD`, `PSP` i `GS` se mogu prikazati kao doslovne, numerički razriješene vrijednosti operacije.
- `J=0` ili `GB=0` znači da se operacija u sigurnom read-only pregledu ne prikazuje kao aktivna putanja.
- `PMU/PMT` se čuvaju kao metapodaci konverzije kada postoje.

## Šta još nije dokazano

- Tačna proizvodna semantika `PO`, `PS`, `PP` i `PA` režima.
- Preslikavanje svih šest `GS` vrijednosti na prednju/zadnju/bočne plohe u 3D-u.
- Da je `PSP` uvijek konačna fizička širina reza nakon svih mašinskih postavki.
- Kako KDT tumači početak/kraj alata, produženja i kompenzaciju radijusa.
- Da li su `J` i `GB` izvan dosad viđenih 0/1 režima dozvoljeni.

Zbog toga IVERTIM Corpus trenutno daje read-only lokalni 2D pregled potpuno razriješene linije i sirovih polja. Ne urezuje 3D geometriju i ne izvozi novu PILA operaciju.

Stvarni makroi za leđa koriste i kratka runtime imena `EVAR.T_L` i `EVAR.T_P`, koja nisu prisutna u svakom E3D elementu. Aplikacija ih zato ne povezuje napamet sa `TIP_LEDJA`, `TIP_PODA` ili `TIP_PLAFONA`, nego ih nudi kao opcionalne ručne vrijednosti uz `PMIN/PMAX` i `AUTOST`.
