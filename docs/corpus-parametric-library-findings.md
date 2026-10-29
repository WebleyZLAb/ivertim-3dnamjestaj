# Aktivna biblioteka — geometrijski izrazi28.10.2026.

Read-only scripts/audit-parametric-library.ts nad lokalnim manifestom, isključeno Rubbish. Exec10499 završio exit0. Svi2649ulazi parsirani,0grešaka.1356fajlova nema neriješenih geometrijskih izraza,1293ima;20655ciljnih geometrijskih polja ostaje neriješeno. Ovo nije potvrda da1356fajlova podržava resize, konture, obrade ili proizvodnju: model bez formula takođe može imati nula grešaka grafa.

| Nedostajući kontekst | Broj fajlova |
|---|---:|
| OVERLAPXL |970|
| OVERLAPXR |970|
| CLR porodica |871|
| PARAMEB |498|
| EVAR porodica |257|
| VISINA_NOGICA |180|
| DE porodica |110|
| L_POD.V |84|

Broj se računa jednom po fajlu za dato ime/porodicu; redovi se preklapaju i ne sabiraju se kao različiti fajlovi. Po razlozima1266missing,1233unresolved,33invalid,14value — takođe preklapajući skupovi. Konačni privatni detalji u Git-ignored .local-corpus-archive/analysis/parametric-library-readiness.json, stdout u helper parametric-library-audit.txt.

Najveći dokazani sljedeći prioritet je porijeklo OVERLAPXL/XR, CLR u front kontekstu, odvojeno PARAMEB u ladicama, zatim EVAR. Nisu pretpostavljene nule, debljine ni pravila prekopa. VISINA_NOGICA može zahtijevati sistemski kontekst; odsustvo na lokalnom elementu nije dokaz neispravnog izvornog modela.

Ograničenje dijagnostike otkriveno ovim pregledom: nekoliko neriješenih AABB referenci u privatnom reportu nosi interni ključ E0B*_AABB_*. To nije korisnički naziv reference; pri nastavku sačuvati/mapirati izvorno ime umjesto zaključivanja semantike iz internog ID-a. Ne mijenja ukupni broj razriješenih fajlova.

Zašto: birati istraživanje prema stvarnom obuhvatu aktivne biblioteke. Činjenica da dva probna modela rade ne potvrđuje širu jednakost Corpusu. Puni cilj ostaje aktivan.


## Dopuna — provjereni primjeri i prikaz
Aurora_Base_Handles/BC_1DR_2DR koristi EXF=overlapxl. Hettich_Drawers/ArciTechDrawers/ArciTech_126_L_Anthracite koristi s-(2*parameb)-52.5 odnosno -64. Nije izvedeno njihovo porijeklo/vrijednost. Kod nakon ovog audita popravlja čitljiv naziv neriješenog AABB aliasa; privatni report ostaje istorijski rezultat prethodnog punog prolaza.329testova/build.
