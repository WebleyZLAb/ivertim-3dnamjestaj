# Editor elemenata — stanje 24.10.2026.

Korisnik je odobrio početak editora prema oba snimka, zatim izričito commit/push trenutnog rada i nastavak do limita. Jednokratni nastavak zakazan u istom chatu za 20:15 Europe/Budapest. Poslije ovog checkpoint commita novi rad ne commitovati bez komande ili zatvaranja sesije.

## Urađeno

- Editor otvara uvećan radni prozor: tabovi Osnovni, Dodavanje, Pogledi, Uređivanje, Krivulje, Bušenje; uz postojeće Materijali, Proizvodnja i Napredno. Kotiranje i dobavljački dodaci nisu implementirani.
- Veliki 3D prikaz, stablo direktnih ploča desno, identitet i varijable; donji panel izabranog konteksta. Razdjelnici rade mišem i strelicama tastature. Donji panel još prikazuje alatke aktivnog taba, nije potpuna replika stalne Corpus trake svojstava.
- Izbor stabla i prikaza je povezan. Aktivna ploča je ljubičasta; lokalne XYZ/0 strelice. Kamera se zadržava pri izmjeni geometrije. Pogledi 3D/sprijeda/bočno/odozgo, uklapanje, žičani prikaz i lokalno skrivanje fronti.
- Sesija editora ima sopstveni Undo/Redo; Prihvati grupiše sesiju u jednu radnju u sobi, Odustani/X vraća početno stanje. Prazna i potpuno poništena sesija čuvaju prethodni Undo/Redo. Zaštićeno i pri 100 ranijih radnji.
- Popravljen zastarjeli indeks izabrane ploče nakon Undo/Redo kada ploča više ne postoji.
- Police/pregrade: broj, debljina, prednje uvlačenje, jednake čiste praznine ili pojedinačni položaji od početka otvora. Otvor se može ručno podesiti; početna procjena bokova, horizontalnih ploča i ravni leđa mora se provjeriti. Ne postoji oznaka fiksnosti/tehnologije niti automatsko ponovno generisanje poslije promjene omotača.
- Dodavanje više ploča zapisuje kompletan E3D u jednoj radnji, jedinstvena imena, čuva ranije ploče i materijal.

## Provjereno

- Build/typecheck prolaze. Posljednji puni prolaz: 225/225 testova.
- Novi testovi: geometrija + stvarno bušenje u jednoj sesiji i zajednički Undo snimak; istorija pri 100 radnji; jednake praznine, ručni položaji, orijentacije i nevažeći rasporedi; E3D izvoz/ponovno učitavanje/krojna lista dodanih polica.
- UI: demo ploča Y100→140→Undo100; Y150→Odustani vraća početni projekat. Generisan korpus 818×720×320 s frontom, skrivena fronta ostaje u stablu i podacima; dodane četiri police, prihvaćene, jedan Undo vraća šest izvornih ploča.
- Tokom UI provjere ispravljeno prekrivanje vrha editora glavnom trakom (host sada iznad nje). Ova posljednja korekcija i procjena unutrašnje ravni leđa traže još vizuelnu provjeru u obnovljenom tabu.

## Nastaviti

1. Završiti UI provjeru posljednjeg builda: obnovi lokalnu probnu sesiju, otvori editor, provjeri vrh/tabove, rezanje panela, razdjelnike, pogled i kameru pri promjeni položaja, Undo/Redo/ponovno otvaranje. Sačuvati screenshot.
2. Provjeriti police na korpusu s unutrašnjim leđima: početna dubina otvora do ravni leđa, pa prednji uvlačak; ne smiju se preklapati s leđima. Probati ručne pozicije i pregrade.
3. Završiti praktičan biblioteka/element → editor → prihvati → E3D → ponovno učitavanje krug i provjeru materijala/kantova/obrada.
4. Parametarske formule geometrije: model sada ima numerička polja; nije dokazano čitanje/zapis izvornog izraza pozicije. Ne predstavljati to kao gotovo. Prvo kontrolisani E3D uzorak prije/poslije i mapiranje izraza, zatim zavisnosti i atomarni Undo. Postojeći evaluator varijabli nije automatski konstrukcioni mehanizam.
5. Približiti kontekstualnu traku i stalna donja svojstva snimku; potvrditi PD, tipove, fiksne police i makro ravni prije implementacije.

Izvori: `docs/corpus-editor-recording-guide.md`, `docs/corpus-workflow-map.md`; snimci/transkripti su lokalni u ignorisanom `recordings/` folderu. Nema potrebe tražiti cijeli novi video za već pokrivene radnje.
