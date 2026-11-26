# Pregled varijabli elemenata (biblioteka Elmsav)

Izvor: svi E3D elementi biblioteke bez foldera `Rubbish` (2649 fajlova). Brojani su zapisi varijabli (`VARn="ime=izraz"`) bez `ShowD_*`, `@…` (naslovi grupa) i `B/L/D`.

- Različitih varijabli: **711**, zapisa **22466**.
- Varijabli s definisanim izborima u Corpusovom `varvalues.dat` (padajući meni): **75** (od 187 definicija u biblioteci), što pokriva 4695 zapisa.
- Varijable koje liče na Da/Ne (sve vrijednosti 0 ili 1), a nemaju definiciju: **68**.

## Ručkica i fronta

Definisane (padajući meni): `ruc_sm` (ručkica: 1 horizontalna, 2 okomita), `ruc_xo` i `ruc_yo` (pomak X i Y: 10…100), `Handle_NO_YES` (Hide handle).

| Varijabla | Zapisa | Primjeri izraza |
|---|---:|---|
| `Handle_NO_YES` | 205 | `1; 0` |
| `SR` | 59 | `evar.ruc_sm; parent.ruc_sm` |
| `TFR` | 59 | `Front.tipfronte` |
| `rxo` | 59 | `if(ruckica.nasadna=1;0;parent.ruc_xo)` |
| `ryo` | 59 | `if(ruckica.nasadna=1;0;parent.ruc_yo)` |
| `RUCX` | 59 | `if((TFR=6)and(SR=1);s/2-ruckica.s/2;s/2-ruckica.v/2); if((TFR=1)and(SR=1);s-rxo-ruckica.s;` |
| `RUCX1` | 59 | `if(ruckica.nasadna=1;0;rucx); if((TFR=1)and(SR=2);s-rxo-ruckica.v;rxo)` |
| `RUCKICAX` | 59 | `if(SR=1;RUCX;RUCX1)` |
| `RUCKICAY` | 59 | `if(SR=1;v-evar.ruc_yo-ruckica.v;v-evar.ruc_yo); if(SR=1;v-ryo-ruckica.v;v-ryo)` |
| `RUCKICAY1` | 59 | `if(ruckica.nasadna=1;v-ruckica.v;ruckicay)` |
| `RUCKICAX1` | 59 | `if(ruckica.nasadna=1;0;RUCKICAX)` |
| `KUTRUC` | 59 | `if(sr=1;0;270)` |
| `KUTRUC1` | 59 | `IF(ruckica.nasadna=1;0;kutruc)` |
| `ANTARO_INNER_HANDLE` | 8 | `1` |
| `ruc_sm` | 5 | `parent.ruc_sm; 1` |
| `ruc_yo` | 5 | `parent.ruc_yo; 40` |
| `ruc_xo` | 1 | `40` |

Formule položaja su u `lib/corpus-handle-placement.ts` (pravilo preuzeto iz `RUCKICAX`, `RUCKICAY`, `KUTRUC`, `rxo`, `ryo`, `ruckica.nasadna`).

## Najčešće varijable bez definicije izbora (kandidati za padajući meni)

Samo one koje imaju samo vrijednosti 0 i 1 u biblioteci (Da/Ne) i pojavljuju se najmanje 5 puta:

| Varijabla | Zapisa | Vrijednosti |
|---|---:|---|
| `_Montaza` | 668 | 1 |
| `_Lakiranje` | 668 | 1 |
| `typ_modelu_lignumsoft2` | 256 | 0 |
| `AVANTECH_YOU_UNIVERSAL_ANGLE` | 84 | 0, 1 |
| `AVANTECH_YOU_FRONT_STABILIZER` | 84 | 0, 1 |
| `AVANTECH_YOU_FRONT_CONNECTOR_FOR_PANEL_THICKNESS` | 84 | 0, 1 |
| `AVANTECH_YOU_ACTRO_YOU_DEPTH_ADJUSTMENT` | 84 | 0, 1 |
| `AVANTECH_YOU_ACTRO_YOU_CATCHES` | 84 | 0, 1 |
| `gap_from_back` | 64 | 0 |
| `Uvuci_front_levo` | 49 | 0 |
| `Uvuci_front_desno` | 49 | 0 |
| `Uvuci_front_gore` | 49 | 0 |
| `Uvuci_front_dole` | 49 | 0 |
| `TIP_PLOCICE` | 47 | 1 |
| `S_O` | 47 | 0, 1 |
| `SARKA_2` | 47 | 0 |
| `SARKA_3` | 47 | 0 |
| `SARKA_4` | 47 | 0 |
| `SARKA_5` | 47 | 0 |
| `PREPUST_PLAFONA_L_D` | 46 | 1 |
| `TYP_POLACZENIA` | 40 | 0 |
| `POLOZENIE_KOLEK_PRZOD` | 40 | 1 |
| `POLOZENIE_KOLEK_TYL` | 40 | 0 |
| `TYP_POLACZENIA_DODATKOWY` | 40 | 1 |
| `POLOZENIE_KOLEK_SRODEK` | 40 | 0 |
| `Lift_Left_Side` | 35 | 0 |
| `Lift_Right_Side` | 35 | 0 |
| `Tolerance_Y` | 35 | 0, 1 |
| `Tolerance_Z` | 35 | 0 |
| `Tolerance_Width` | 35 | 0 |
| `Default_move` | 35 | 0 |
| `_ABS` | 33 | 1 |
| `_Extra` | 33 | 0 |
| `_Staklo` | 33 | 0 |
| `AVANTECH_YOU_BRANDING_CLIP_ANTHRACITE` | 28 | 0, 1 |
| `AVANTECH_YOU_BRANDING_CLIP_SILVER` | 28 | 0, 1 |
| `AVANTECH_YOU_BRANDING_CLIP_WHITE` | 28 | 0, 1 |
| `PREPUSTENA_FRONTA` | 19 | 0 |
| `l_pod` | 19 | 0 |
| `l_plafon` | 19 | 0, 1 |

## Najčešće varijable koje imaju definiciju (već padajući meni)

| Varijabla | Zapisa | Izbori |
|---|---:|---|
| `Innotech_Atira_FC` | 394 | For screwing on, With expanding dowels |
| `Innotech_Atira_CC_A` | 394 | With Hettich logo, Neutral |
| `Innotech_Atira_FS` | 322 | No Stabilizer, InnoTechVB 36 with ball pin, Front bracket |
| `Innotech_Atira_SS` | 322 | No Stabilizer, Side stabiliser |
| `Handle_NO_YES` | 205 | Yes, No |
| `AT_Caps` | 186 | Neutral, With Hettich logo |
| `AT_CapsColor` | 186 | White, Anthracite, Chrome look, Stainless steel look, Aluminium look |
| `AT_DesignProfile` | 186 | None, Aluminium look, Stainless steel look, Chrome look, Oak decor |
| `AT_FrontConnector` | 186 | Knocking in, Screwing on |
| `Leg_height` | 169 | 100, 150 |
| `TYP_OF_BOTTOM` | 133 | Basic bottom, Bearing bottom |
| `t_b` | 115 | TIPLOVANJE, EKSCENTAR+TIPL, KONFIRMAT+TIPL, SRAF+TIPL, LAMELLO+TIPL |
| `LEGRABOX_COLOR` | 115 | Carbon black, Orion grey, Silk White, Stainless steel |
| `Bottom_D_full` | 107 | Yes, No |
| `Top_w` | 103 | Yes, No |
| `TYPE_OF_BACK` | 103 | Without back, Nailed on, Back panel in groove, Back panel in rabbet, Back panel full thickness |
| `AVANTECH_YOU_FRONT_CONNECTOR` | 84 | Screwing_On, Knocking_In |
| `AVANTECH_YOU_DESIGN_PROFILE` | 84 | off, Silver, White, Anthracite, Aluminium |
| `AVANTECH_YOU_ILLUMINATION_DESIGN_PROFILE` | 84 | off, Anthracite, Stainless_Steel |
| `SIDE_TILL_FLOOR` | 82 | Left, Right, Both, None |
| `LEGRABOX_FRONT_FIXING` | 71 | Expando, Expando T, Screws |
| `TIP_LEDJA` | 66 | FALC, NUT, NAKUCAVANJE, PUNA_LEDJA, BEZ_LEDJA |
| `grassslideweight` | 64 | 40kg, 70kg |
| `ANTARO_COLOR` | 58 | Silk White, Stainless steel |
| `AT_DoubleRegling` | 56 | Yes, No |

## Ručkica: kako je Corpus radi i šta je urađeno

- **Element:** ručkica je dijete fronte klase `TRuckicaElement` (tip 14), s okovom iz kataloga (npr. `Corpus_Handle_matt 190x35mm`, UID 10000008) u `POTROSNI`; mjere (`s`, `v`, `d`) i `nasadna` (nasadna, na ivici) čita fronta u formulama. Biblioteke ručki: `Handles` (npr. `Classic/Corpus_Handle_11_Pipe_black_144x28mm.e3d`), `_RUCKICE`, `HRANIPEX_HANDLES`.
- **Varijable fronte/kuhinjskog elementa:** `ruc_sm` (smjer), `ruc_xo`, `ruc_yo` (pomaci) već imaju padajuće izbore, a `Handle_NO_YES` sakriva ručkicu.
- **Položaj:** `corpusHandlePlacement` (`lib/corpus-handle-placement.ts`) računa X, Y i kut iz tih varijabli: vodoravna `X = s − rxo − r.s` (vrata tipa 1) ili `rxo`, `Y = v − ryo − r.v`; okomita kut 270°; nasadna `X = 0`, `Y = v − r.v`. Provjereno testovima (5) na formulama iz biblioteke; nije povezano s umetanjem.
- **Umetanje:** meni *Umetanje → Ručkica na front…* (`src/handle-dialog.tsx`, `lib/handle-insert.ts`). Dijalog nalazi uspravne fronte izabranog elementa i njegovih pod-elemenata (npr. D1V → "Fronta / FRD"), nudi ručke iz biblioteke (`Handles`, `_RUCKICE`, `HRANIPEX_HANDLES`, bez kopija u `Rubbish`; 1276 stavki, s pretragom), smjer (horizontalna/okomita) i pomake od ivice i vrha; početne vrijednosti su varijable elementa `ruc_sm`, `ruc_xo`, `ruc_yo` ako postoje. Ručka se umeće kao zaseban element oblika kvadra mjera ručke (npr. 144 × 16 mm, izbočenje 28 mm) na vanjskoj strani fronte; pozicija, ugao 0/90/180/270 i pomaci pod-elemenata se računaju iz geometrije elementa.
- **Provjereno:** testovi (9) i u pregledniku na D1V iz biblioteke s ručkom `Corpus_Handle_11_Pipe_black_144x28mm`: element "Rucka_…" je dodan na očekivanom položaju (X+42, Y 762 za vrata tipa 2).
- **Pravi 3D model ručke:** ručka iz biblioteke (`Elmsav/Handles`) nosi okov iz kataloga (`POTITEM`), a katalog daje model (`Modeli/Handles/*.dae`): svih 53 ručke u `Handles` imaju postojeći `.dae`. `scripts/refresh-handle-models.ts` pravi `public/local-corpus/handle-models.json` (ručka → model) i kopira modele u `public/local-corpus/Modeli` (privatno, izvan gita; 53 fajla, 53 MB; za `_RUCKICE` i `HRANIPEX_HANDLES` treći argument, ali su modeli veliki, oko 1,1 GB). Umetnuti element pamti model u opisu (`EOPIS`: `ivertim-model=Handles/106_62_115.dae`, `lib/element-model-ref.ts`), a 3D prikaz (`src/element-model-3d.ts`, `ColladaLoader`) kvadar mjera ručke zamjenjuje učitanim modelom: najduža mjera modela ide na najdužu mjeru kvadra, druga na drugu, treća na treću. Provjereno u pregledniku na D1V s `Corpus_Handle_11_Pipe_black_144x28mm`: model je učitan (200 OK, bez grešaka) i vidi se kao kromirana šipka s crnim nosačem.
- **Nije urađeno:** okov iz kataloga u listi okova elementa, varijabla "ručkica" na elementu koja pamti izbor, nasadna ručka, prepravka položaja nakon umetanja i tačna orijentacija modela (uklapanje je po rangu mjera, pa se uglavnom simetrične ručke mogu ispasti zrcalno okrenute); modeli ručki iz `_RUCKICE` i `HRANIPEX_HANDLES` nisu kopirani.
