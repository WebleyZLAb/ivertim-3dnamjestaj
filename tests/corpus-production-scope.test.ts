import assert from "node:assert/strict";
import test from "node:test";
import { corpusElementProductionScope } from "../lib/corpus-production-scope.ts";
import { buildCorpusCutList } from "../lib/corpus-cutlist.ts";
import { buildCorpusConsumablesList } from "../lib/corpus-consumables.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

const xml=`<PROJECTFILE VER="17"><ELEMENT ENAME="Parent" EVISIBLE="false"><ELMLIST><ELM ENAME="Child" EVISIBLE="true"><DASKE><AD DNAME="Panel" VISINA="600" DUBINA="400" DEBLJINA="18"><POTROSNI><POTITEM TIP="0" NAZIV="Edge" KOMADA="1"/></POTROSNI></AD></DASKE><ELMLIST><ELM ENAME="Grandchild" EVISIBLE="true"><DASKE><AD DNAME="Second" VISINA="300" DUBINA="200" DEBLJINA="18"/></DASKE></ELM></ELMLIST></ELM></ELMLIST></ELEMENT></PROJECTFILE>`;

test("izolovani pregled potomka nasljeđuje skrivanje kroz cijelu putanju bez izmjene izvora",()=>{
  const root=parseCorpusS3d(xml).elements[0]!;
  const before=JSON.stringify(root);
  for(const path of [[0,0],[0,0,0]]){
    const scope=corpusElementProductionScope(root,path);
    assert.equal(scope.hiddenByAncestor,true);
    assert.equal(scope.element.visible,false);
    const cut=buildCorpusCutList([scope.element]);
    assert.equal(cut.items.length,0);
    assert.equal(cut.excludedHiddenBoards,cut.totalBoards);
    assert.equal(buildCorpusConsumablesList([scope.element]).length,0);
  }
  assert.equal(JSON.stringify(root),before);
  assert.equal(root.children[0]!.visible,true);
});

test("vidljivi roditelji čuvaju vlastitu vidljivost djeteta i referencu modela",()=>{
  const root=parseCorpusS3d(xml.replace('ENAME="Parent" EVISIBLE="false"','ENAME="Parent" EVISIBLE="true"')).elements[0]!;
  const scope=corpusElementProductionScope(root,[0,0]);
  assert.equal(scope.hiddenByAncestor,false);
  assert.equal(scope.element,root.children[0]);
  assert.equal(buildCorpusCutList([scope.element]).items.length,2);
  assert.equal(buildCorpusConsumablesList([scope.element]).length,1);
  assert.equal(corpusElementProductionScope({...root,visible:false}).element.visible,false);
  assert.throws(()=>corpusElementProductionScope(root,[1]),/korijenskim/);
  assert.throws(()=>corpusElementProductionScope(root,[0,3]),/ne postoji/);
});
