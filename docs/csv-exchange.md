# CSV krojne liste za razmjenu podataka

U prozoru Materijali i krojna lista otvoriti Postavke CSV izvoza krojne liste. Izbor separatora, decimalnog znaka, zaglavlja i BOM-a važi za dugme Izvezi CSV i za glavni meni Export → Krojna lista CSV. Postavke traju do zatvaranja aplikacije; ponovno otvaranje prozora ih čuva. Potrošni CSV ima zaseban postojeći format.

Zadano: UTF-8 sa BOM-om, tačka-zarez, decimalni zarez, zaglavlje, CRLF novi red. Dostupni su i zarez ili tabulator kao separator, decimalna tačka, izostavljanje zaglavlja ili BOM-a. Navodnici se automatski dodaju oko separatora, navodnika i višerednog teksta. Ako su i decimalni znak i separator zarez, decimalna mjera ide u navodnike.

## Kolone, redom

| # | Kolona | Značenje |
|---|---|---|
| 1 | Materijal | Naziv iz ploče |
| 2 | UID materijala | Izvorni identifikator |
| 3 | VISINA mm | Izvorna lokalna mjera ploče |
| 4 | DUBINA mm | Izvorna lokalna mjera ploče |
| 5 | Debljina mm | Završna debljina |
| 6 | Količina | Broj ploča u grupi |
| 7 | Rupe | Zbir sačuvanih rupa u grupi |
| 8 | Skrivene | Broj skrivenih u grupi; u redovnom proizvodnom obuhvatu 0 |
| 9 | Elementi i ploče | Trag do izvora, razdvojen znakom ` | ` |

Pregled pokazuje najviše tri grupe. Download obuhvata sve grupe izabranog obuhvata (projekat ili označena grupa), uz postojeće izostavljanje skrivenih i nepotpunih mjera. Dimenzije se ne rotiraju, ne umanjuju za kant i ne prevode u CNC koordinate. Lista je zbir po materijalu i mjerama; nije per-board program obrade.

## Granica potvrde

Ovo je Ivertim razmjena podataka, bez tvrdnje da je potvrđen Maretta uvozni profil. Tačan redoslijed/materijali/rubovi/god/programi za proizvodni optimizator i dalje zahtijevaju odvojenu provjeru. Pogledati maretta-csv-integration-evidence.md. Zarez/tačka-zarez/tab i postavke zaglavlja dokumentovane su i u lokalnom Maretta priručniku, ali to samo po sebi ne potvrđuje trenutni profil.

Provjera 29.10.2026: 342 testa i build; stvarni browser download PLAFON_PLATA, nezavisni Python CSV parser, identični bajtovi izvoza iz menija i dijaloga. Izvorni E3D i instalacije optimizatora nisu mijenjani.
