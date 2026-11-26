# Osnovna edukacija 2/7: analiza prije snimanja

Izvor: tekst i slike lekcije (`corpus-baza/edukacije/02-osnovna-edukacija-27.md`, 39 koraka), upoređeno s našim programom 26.11.2026. Ništa od ovoga nije snimljeno u Corpusu; statusi su iz koda i iz tvojih S3D projekata.

## Tok lekcije i status u našem programu

| Koraci | Šta Corpus radi | Naš program |
|---|---|---|
| 1–3 | **Soba**: svjetlina, sjene, dimenzije; zid je podijeljen na **gornji i donji zid** (visine određuju gdje idu viseći elementi) | Imamo dimenzije sobe, visinu i donju visinu (`VISINA`, `VISINALOW`). **Svjetlina i intenzitet sjena nisu u postavkama** (sjene su uključene u 3D prikazu, bez kontrole). |
| 4–8 | **Dekori zidova i poda** povlačenjem materijala na sliku (Zid gore, Zid dolje, Pod, mape Zidovi/Podovi) | Pod uzimamo iz `PNAME`; zidovi su bijeli sa izborom jedne boje. **Nema odvojenih dekora za Zid gore/dolje i izbora iz kataloga** (`ZDNAME`, `ZGNAME`, `SNAME` postoje u S3D-u). |
| 9–13 | Označi zid, iz baze učitaj elemente (Aurora_Base_Handles → BC_1D; Aurora_Wall_Handles za gornje) | Imamo biblioteku i umetanje s mjerama. **Nema umetanja „na označeni zid“** (automatsko postavljanje uz zid). |
| 14–17, 21 | **Umetanje → Radna ploha, Zidna lajsna, Cokla** (cokla bez prethodnog označavanja) | **Cokla i Radna ploha: urađeno** (vidi dolje). **Zidna lajsna: nema.** |
| 18–20 | **Stropna ploha** i **Podna ploha** na označene elemente (Shift označava više) | **Nema.** |
| 22–27 | Desni klik na element → **Grijaču ploču / Sudoper** → Učitaj (ubacivanje u element) | **Nema** kontekstnog umetanja u element. |
| 28–30 | Editor: sudoper je centriran na fronti; pomakni ga po X osi (crvena osa), *Prihvati izmjene* | Imamo editor i Prihvati izmjene; **nema ose/gizma za pomicanje u 3D-u** (pomicanje je brojevima i strelicama). |
| 32–39 | **Promjena uzoraka**: materijal i/ili rubne trake odjednom, pazi na debljinu (18 mm svi osim radne ploče 38 mm), i za stropnu/podnu plohu | Imamo *Provjera i zamjena materijala*; **nema izbora „samo materijal / samo trake / oba“ i filtra po debljini** kao u lekciji. |

## Šta tvoji projekti kažu o radnoj ploči i cokli (Kuhinja_1)

- **Radna_Ploha:** običan `TElement` sa jednom daskom, varijabla `RPTIP=1`, širina 3584 (raspon pokrivenih elemenata), visina (debljina) 36, dubina 600, na Y 880. **Z.O.** (zidna obloga) isto `RPTIP=1`, debljina 10, dubina 640, na istom Y.
- **Cokla:** `TElement` širine elementa (600), visina 85–95, debljina 18, na Y 0 i Z 563 (isti Z kao element iznad); ima varijablu `t_b`.
- Nije poznato: koja pravila određuju prepust ploče, širinu preko više elemenata, spojeve pod uglom ni značenje `RPTIP`. To se može dobiti iz snimka koraka 14–21, ili iz S3D-a nastalog samo jednim klikom Umetanje → Radna ploha na jednom elementu.

## Predlog sljedećeg koraka

1. **Najjeftinije i najkorisnije:** Umetanje → **Cokla** i **Radna ploha** za označene donje elemente (korak 14–17, 21), jer već imamo uzorke strukture. Za provjeru treba po jedan S3D iz Corpusa sa samo jednim elementom i tom operacijom, ili kratak snimak.
2. Kontekstno umetanje **Grijaća ploča / Sudoper** u element (22–27).
3. **Dekori zidova** (Zid gore/dolje, `ZDNAME`/`ZGNAME`) i **Promjena uzoraka** sa izborom materijal/trake i filtrom debljine (32–39).
4. Postavke sobe: svjetlina i sjene (1–3).

Snimci koji bi pokrili sve: *02-1-soba-dekori.mp4* (koraci 1–8), *02-2-umetanje-ploha-cokla.mp4* (14–21), *02-3-grijaca-sudoper.mp4* (22–30), *02-4-promjena-uzoraka.mp4* (32–39).


## Urađeno 26.11.2026: Umetanje → Cokla i Radna ploha

`lib/kitchen-inserts.ts`, meni *Umetanje → Cokla* i *Radna ploha* (rade na označenim elementima ako je označeno bar dva, inače na svim donjim elementima).

Pravila su izvedena iz dva tvoja stvarna projekta i **provjerena poređenjem dasaka** (granice dasaka, ne samo mjere elementa) sa Corpusovim elementima u Tijana_kuhinja:
- **Donji element:** na podu (Y 0), ugao 0°, visina 600–1000, dubina do 700, nije cokla/radna ploha/obloga (`RPTIP`) ni zidna letvica. Nizovi su susjedni elementi na istom Z (razmak do 5 mm).
- **Radna ploha:** po nizu jedna; X početka niza, širina niza, Y = vrh elemenata, Z = najisturenija prednja ivica niza + 37 mm prepusta, dubina 600, debljina 38 (Corpus ploha: Z 0–600, Y 820–858 se poklapa).
- **Cokla:** po nizu elemenata s nevidljivim nogicama (`VIDLJIVOST_NOGICA=0`), visina `VISINA_NOGICA − 5` (95), debljina 18, daska leži **iza** prednje ivice (Z 545–563 uz prednju ivicu 563, kao u Corpusu). Niz se prekida na elementu s vidljivim nogicama.
- Materijal se uzima od prve daske prvog elementa niza (mijenja se u zamjeni materijala); mjere se mijenjaju u editoru. Dodavanje je jedan korak za poništavanje.

Uglovi: podržani su 0°, 90°, 180° i 270° preko lokalnog koordinatnog sistema elementa (osa širine u = (cos θ, −sin θ), osa dubine v = (−sin θ, −cos θ); položaj je prednja ivica, tijelo se pruža duž v). Provjereno i na desnom zidu Tijane (270°): ploha dobije položaj (1860, 820, 0), širinu 2000 i daske X 1860–2460, Z 0–2000, kao Corpusova.

Postojeće cokle i ploče (isti naziv, ugao i Y, preklapanje bar pola širine) se prepoznaju i preskaču uz poruku.

Ograničenja: elementi pod uglovima koji nisu pravi se preskaču; nizovi pod suprotnim uglovima na istom zidu (npr. 90° i 270°) se ne spajaju (Corpusova ploha na desnom zidu Tijane spaja ih u jednu od 2000 mm); nema spojeva na uglovima; prepust i dubina su fiksni (37/600); `RPTIP` se ne postavlja. Zidna lajsna, Stropna i Podna ploha nisu urađene.
