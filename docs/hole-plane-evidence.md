# Dokaz za Corpus ravni bušenja

## Obuhvat

Read-only audit pokreće se komandom:

```powershell
pnpm audit:holes "PUTANJA_DO_S3D_ILI_E3D_FOLDERA"
```

Audit ne mijenja izvorne fajlove. Broji `RPL`, `SMJER` i `RAL` kombinacije i
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
