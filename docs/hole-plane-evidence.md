# Dokaz za Corpus ravni bušenja

## Obuhvat

Read-only audit pokreće se komandom:

```powershell
pnpm audit:holes "PUTANJA_DO_S3D_ILI_E3D_FOLDERA"
```

Audit ne mijenja izvorne fajlove. Broji `RPL`, `SMJER` i `RAA` kombinacije i
čuva ograničen broj primjera samo kada se zatraži drugim argumentom.

## Rezultat lokalnih korpusa

| Izvor | Fajlovi | Ploče | Rupe | RPL=0 | RPL=1 | RPL=2 | bez RPL |
|---|---:|---:|---:|---:|---:|---:|---:|
| `sobasav` | 30 | 7.159 | 1.844 | 17 | 1.826 | 0 | 1 |
| `CorpusSolutions/Elmsav` | 2.671 | 18.015 | 892 | 32 | 855 | 3 | 2 |

Svih 2.701 fajlova je parsirano bez greške.

## Zaključak koji se koristi u modeleru

- `RPL=0` i `RPL=1` pojavljuju se kao par na zrcalnim lijevim/desnim pločama
  istog elementa i koriste iste lokalne `RXP/RYP` koordinate. Modeler ih zato
  tretira kao suprotne glavne strane ploče.
- `RPL=1` ulazi sa maksimalne strane lokalne ose debljine, a `RPL=0` sa
  minimalne strane.
- Dubina jednaka ili veća od debljine daje kroz-rupu; manja dubina daje
  slijepi otvor sa fizičkim dnom.
- `RPL=2` se pojavio samo tri puta, u jednom okovskom E3D elementu. Taj mali
  uzorak ne dokazuje njegovu osu i stranu, pa ostaje vizuelni marker bez reza.
- Zapisi bez ravni ili bez potpunih mjera ostaju sačuvani, ali ne stvaraju
  fizičku šupljinu.

Ovo je statički zaključak iz sačuvanih projekata, ne tvrdnja da je posmatrano
izvršavanje originalnog Corpus programa.


## Prikaz nepotvrdjenih ploha busenja

Ponovna provjera pokazuje da fizicki rez postoji samo zaRPL0/1; rezervni prikaz ostalih zapisa koristio je tamni cilindar iste ose kao glavna ploha, pa je mogao izgledati kao potvrdeno busenje. Rezervni marker je sada narandzasti zicani oktaedar bez sugerisane ose. Za izabranu plohu2..5 editor prikazuje status: orijentacioni simbol, priblizan polozaj, smjer/fizicki rez nisu potvrdeni; izvorni parametri ostaju uizvozu. Nema izmisljene mape0..5 niti primjeneRAA45kaopotvrdjenognagiba.

Audit scripts/audit-hole-planes.ts sada ispravno oznacavaRAA (ranije izlazni labelRAL iako je parservec citaoRAA) i koristi decodeCorpusText umjesto slepogUTF8. Ponovljen read-only cijeli public/local-corpus/Elmsav:5176fajlova/5176parsed/0gresaka,32703ploca,1315rupa, RPL0=41,1=1269,2=3,null=2. Ovo je cijelo lokalno stablo, ukljucuje arhivske/duple kopije; nije brojaktivnihmanifeststavki i ne porediti ga direktno sa ranijim2671drugogpresjeka. Svih1313zapisa sRPL imajuRAA0;2bezRPLimajuRAAnull. TriRPL2su_OKOV/Noge_stola/Noga_tempo_t600_.e3d / NOSAC NOGE ART30076 / Podnica, SMJER1. Nema sacuvanihRPL3..5uovomauditu. Ovaj ograniceni primjer i dalje ne dokazuje stranu/oseRPL2. Izlazhelperhole-plane-current-audit.json ostaje vanGita/vaulta.

340testova/buildpass exec25562exit0. Reactpregledprimijenjen: uslovnistatusbeznovihhookova, oznacenrole=status/aria-label; novimarkerbezrasvjetnogproracuna. Browser tab5stvarniE3D saRPL5 pokazuje tacanstatus, warn/errorlogprazan; screenshothelperhole-preview-status.jpg. Geometrijski izgled simbola nije zasebno certifikovan screenshotom u ovom kadru jer model je udaljen; implementacija/build potvrdjeni. Ne tvrditi fizicko busenje svih6ploha.

Zasto: uskladiti ono sto korisnik vidi s onim sto potvrdeni podaci stvarno dozvoljavaju, uz dalji originalni cilj. Nema novog dizajna/proizvodne semantike; bezcommita/pusha. Goalaktivan.
