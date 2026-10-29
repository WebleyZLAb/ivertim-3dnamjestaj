# Grupna izmjena postojeće varijable

U sobi označiti najmanje dva korijenska elementa kroz + u stablu. U svojstvima izbora pojavljuje se Varijabla za označenu grupu. Alat zahtijeva da svaka označena meta ima vlastiti E3D izvor (uvezeni ili novi element); izvorni elementi unutar S3D-a nisu ovdje podržani.

Izabrati zajedničku varijablu i unijeti vrijednost ili izraz, zatim Pregledaj grupnu izmjenu. Svaki E3D se priprema i preračunava u vlastitom kontekstu. Pregled navodi tačne ciljeve, njihove stare/nove vrijednosti i promjene položaja, mjera, uglova i vidljivosti. Treba provjeriti da ista varijabla ima željeno značenje u svim ciljevima; jednak naziv ne znači automatski isti tip elementa.

Primijeni na N elementa upisuje sve rezultate zajedno. Jedan sobni Poništi vraća cijelu grupu i njene E3D izvore; Ponovi ih vraća. Neoznačeni elementi se ne mijenjaju. Promjena projekta ili označenog skupa poslije pregleda zahtijeva novi pregled. Zaključana meta, nedostajuća varijabla, nerazriješen novi izraz ili nedozvoljena dimenzija odbijaju pripremu cijele grupe.

Ovaj alat mijenja jednu postojeću varijablu. Ne prenosi cijelu konstrukciju i ne potvrđuje regenerisanje proizvodnih makroa, fizičku mapu ploha/rubova ili kompatibilnost s optimizatorom. Sačuvane rupe i nepoznati zapisi prolaze postojeći E3D writer.

Provjera 29.10.2026: dva označena i jedan neoznačen element, vrijednosti25→40, različite širine/položaji, jedanUndo/Redo, XML stvarnih download-a i ponovno učitavanje u čistu browser sesiju.347testova i uspješan završni build. Nalazi u corpus-basic-cycle-audit.md.


### 29.10.2026. — čuvanje i obnova grupne promjene

Zašto: poslije grupne primjene treba dokazati trajnost cijelog projekta, ne samo pojedinačni E3D izvoz. Nova integraciona regresija u corpus-group-variables.test.ts priprema dva cilja i neoznačeni treći, prolazi stvarne E3D izvore kroz createCorpusWorkingCopyFile → JSON stringify/parse → recovery snapshot → applyCorpusWorkingCopyProject, pa duboko poredi sva tri elementa i izvore, vrijednosti40/40/25, položajeploča40/40/25 i originalElement identitete. Puna regresija348/348 i typecheck exit0 (session62202). Aplikacijski kod nije mijenjan, posljednji završni build23007 ostaje važeći.

Browser tab6 → stvarno dugme Sačuvaj radnu kopiju → Downloads/NOVI-IVERTIM-PROJEKAT.ivertim-corpus.json. Nezavisni Python parser potvrđuje verziju9, tri uvezena E3D XML-a, VAR TEST_POMAK40/40/25, XFTEST_POMAK, lokalniX40/40/25, širine1000/900/1000, položaje korijena4036/5036/6036. Nova čista sesija tab9 → početni Vrati sesiju → isti tri naziva, vrijednosti, širine i položaji kroz UI. Obnovljeni GRUPA_B izvezen kao POLICA-IVERTIM (7).E3D; XML stablo identično pre-obnovnom (3).E3D. Helper group-recovery-ui-proof.json, verify-group-recovery-copy.py, group-recovery-proof.jpg. Browser warn/error prazan, tab9 zadržan za nastavak. Grupni izbor/Undo istorija nisu tvrdnjom uključeni u format oporavka; dokazano stanje modela i izvori.

Prilagođeni cilj ostaje aktivan: praktični lokalni tok je potvrđen, ali audit svih lokalno izvedivih osnovnih komandi i preostalih ograničenja još nije zatvoren. Ne zaključivati punu jednakost Corpusu. Fizičke mape, dinamički spoj i Maretta profil ostaju vanjske provjere po korisnikovoj odluci. Bez commita/pusha.
