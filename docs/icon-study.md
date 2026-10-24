# Probni pregled ikona

Otvoriti http://127.0.0.1:4317/icon-study.html nakon pokretanja Ivertim 3D. Može se otvoriti i public/icon-study.html direktno u pregledniku; SVG i kontrole su ugrađeni i rade bez mreže.

Ovo je izdvojen uzorak, bez zamjene ikona u glavnom interfejsu. Osam komandi: Novi, Učitaj, Sačuvaj, Biblioteka, Soba, Editor, Bušenje, Kantovanje. Četiri poređenja: Lucide, Iconsax Linear, Twotone i Bulk. Prvih šest komandi koriste originalne SVG iz službenih paketa, uz promjenu boje na currentColor i izolovane SVG identifikatore. Posljednje dvije su naši prijedlozi, označeni kao takvi; konačne simbole potvrditi prema editor snimku. Za čuvanje kopije Iconsax koristi document-download, jer save-2 predstavlja bookmark.

Kontrole: porodica, neutralna/plava/orah boja, 20/24/32 px, nazivi ili tooltip. Klik mijenja samo probni izbor. Poredbena matrica pokazuje 36 i 24 px. Bez animacije i bez novih zavisnosti aplikacije.

Izvori: službeni iconsax 0.1.1 (https://github.com/iconsax/iconsax-npm), lucide-static 1.61.0 (https://lucide.dev). Autori i Lucide licenca sačuvani u public/icon-study-licenses.txt. Iconsax paket navodi MIT, dok servis objavljuje sopstvene uslove; zadržani izvor i notice, a uzorci integrisani u pregled, bez izdvojenog paketa sirovih ikona.

Preporuka za probu: Iconsax Line za gustu traku, Bulk iz iste porodice za veće komande. Korisnik je izabrao Iconsax i izričito sve tri varijante: Line, Twotone i Bulk, prema namjeni. Lucide ostaje samo u poređenju. Ograničena paleta; 3D samo za veće ulaze, ne za sitne radne komande. Corpus raspored i značenje radnji se čuvaju.

Provjera: produkcijski build prošao; u browseru promijenjene porodica, boja, veličina i nazivi, klik na Kantovanje potvrdio tačan opis. Console bez grešaka.
