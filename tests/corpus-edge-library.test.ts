import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCorpusEdges } from '../lib/corpus-edge-library.ts';
test('kant katalog cuva sve sifre, dostupnost i nepoznata polja uz mikrometre u mm', () => {
  const rows = parseCorpusEdges('<Trake><PotItem Naziv="0.5mm" debljina="500" Extra="keep"><Data Sifra="05_A" Dobavljac="Hrast &amp; bijela" Sirina="22" MatName="001" Ima="true" Cijena="0"/><Data Sifra="05_B" Sirina="23" MatName="002" Ima="false"/><Dodatno OznId="{group}"/></PotItem></Trake>', '05mm.cxm');
  assert.equal(rows.length,2); assert.equal(rows[0]!.thickness,0.5); assert.equal(rows[0]!.width,22);
  assert.equal(rows[0]!.name,'Hrast & bijela'); assert.equal(rows[0]!.materialUid,'001');
  assert.equal(rows[0]!.groupUid,'{group}'); assert.equal(rows[0]!.fields.Cijena,'0');
  assert.equal(rows[0]!.groupFields.Extra,'keep'); assert.equal(rows[1]!.available,false);
});
test('kant katalog odbija neispravan XML i nepoznatu debljinu', () => {
  assert.throws(() => parseCorpusEdges('<Trake>','bad'));
  assert.throws(() => parseCorpusEdges('<Trake><PotItem debljina="200"/></Trake>','bad'));
  assert.equal(parseCorpusEdges('<Trake/>','empty').length,0);
});
