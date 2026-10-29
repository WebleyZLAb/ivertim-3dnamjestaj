import assert from "node:assert/strict";
import test from "node:test";
import { corpusVariableDraftHasSourceNames } from "../lib/corpus-variable-draft.ts";

test("promjena vrijednosti ne potvrđuje pripremljeno dodavanje, preimenovanje ili brisanje", () => {
  const source = { WIDTH: "600", HEIGHT: "720" };
  const before = JSON.stringify(source);
  assert.equal(corpusVariableDraftHasSourceNames(source, [{name:"WIDTH",value:"800"},{name:"HEIGHT",value:"720"}]), true);
  assert.equal(corpusVariableDraftHasSourceNames(source, [{name:"WIDTH",value:"800"},{name:"HEIGHT",value:"720"},{name:"NEW",value:"25"}]), false);
  assert.equal(corpusVariableDraftHasSourceNames(source, [{name:"WIDTH_RENAMED",value:"800"},{name:"HEIGHT",value:"720"}]), false);
  assert.equal(corpusVariableDraftHasSourceNames(source, [{name:"WIDTH",value:"800"}]), false);
  assert.equal(corpusVariableDraftHasSourceNames(source, [{name:"width",value:"800"},{name:"HEIGHT",value:"720"}]), false);
  assert.equal(JSON.stringify(source), before);
});

test("nakon čuvanja ili poništavanja upoređuje se sa aktuelnim skupom", () => {
  const original = { WIDTH:"600" };
  const saved = { WIDTH:"600", OFFSET:"25" };
  const draft = [{name:"WIDTH",value:"600"},{name:"OFFSET",value:"30"}];
  assert.equal(corpusVariableDraftHasSourceNames(original,draft), false);
  assert.equal(corpusVariableDraftHasSourceNames(saved,draft), true);
  assert.equal(corpusVariableDraftHasSourceNames(original,[{name:"WIDTH",value:"650"}]), true);
});
