import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCorpusScriptMenu} from '../lib/corpus-script-library.ts';
test('TOC cuva vise stavki, relativne putanje i dodatna polja',()=> {
 const items=parseCorpusScriptMenu('\uFEFF[Menu1]\r\nScriptname=Rupe\r\nScfile=Folder\\Rupe.cps\r\nICON=pic.bmp\r\nCACHE=1\r\n\r\n[Menu2]\nScriptname=Druga\nScfile=druga.cps\nHint=a=b\n');
 assert.equal(items.length,2);assert.equal(items[0]!.name,'Rupe');assert.equal(items[0]!.script,'Folder\\Rupe.cps');assert.equal(items[0]!.fields.CACHE,'1');assert.equal(items[1]!.fields.HINT,'a=b');
});
test('TOC razlikuje prazan izvor od dostupne skripte',()=>{
 assert.equal(parseCorpusScriptMenu('[Empty]\nScriptname=Samo dugme')[0]!.script,'');
 assert.deepEqual(parseCorpusScriptMenu('; comment\n'),[]);
});
