import assert from "node:assert/strict";
import test from "node:test";
import { corpusBoardSelectionAfterStructure as remap } from "../lib/corpus-board-selection.ts";
import { duplicateCorpusE3dBoards, duplicateCorpusE3dBoardCopies, moveCorpusE3dBoard, removeCorpusE3dBoards } from "../lib/corpus-s3d-writer.ts";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";

const xml = '<ELEMENTFILE><ELEMENT><DASKE DCOUNT="4"><AD DNAME="A"/><AD DNAME="B"/><AD DNAME="C"/><AD DNAME="D"/></DASKE></ELEMENT></ELEMENTFILE>';
const names = (source: string, indexes: number[]) => { const boards = parseCorpusE3d(source).elements[0]!.boards; return indexes.map(index => boards[index]!.name); };

test("copying multiple boards keeps originals selected and excludes inserted copies", () => {
  const selection = [0, 2, 3];
  const output = duplicateCorpusE3dBoards(xml, [{boardIndex:0,name:"A copy",position:[0,0,0]}, {boardIndex:2,name:"C copy",position:[0,0,0]}]);
  const mapped = remap(selection,4,{kind:"copy",copies:[{boardIndex:2,count:1},{boardIndex:0,count:1}]});
  assert.deepEqual(mapped,[0,3,5]);
  assert.deepEqual(names(output,mapped),["A","C","D"]);
  assert.deepEqual(selection,[0,2,3]);
  assert.deepEqual(remap([1,3],4,{kind:"copy",copies:[{boardIndex:0,count:5}]}),[6,8]);
  const array = duplicateCorpusE3dBoardCopies(xml, 0, Array.from({ length: 5 }, (_, index) => ({name: `A copy ${index}`, position: [0, 100 * index, 0] as const})));
  assert.deepEqual(names(array, remap([1,3],4,{kind:"copy",copies:[{boardIndex:0,count:5}]})),["B","D"]);

});

test("removing a board drops it from selection without selecting its successor", () => {
  const output = removeCorpusE3dBoards(xml,[0,2]);
  const mapped = remap([0,2,3],4,{kind:"remove",indexes:[2,0,2]});
  assert.deepEqual(mapped,[1]);
  assert.deepEqual(names(output,mapped),["D"]);
  assert.deepEqual(remap([0,2],4,{kind:"remove",indexes:[0,2]}),[]);
});

test("moving either direction follows the same boards rather than their old indexes", () => {
  for(const [from,to] of [[0,3],[3,0],[1,1]]) {
    const mapped=remap([0,2],4,{kind:"move",from:from!,to:to!});
    assert.deepEqual(new Set(names(moveCorpusE3dBoard(xml,from!,to!),mapped)),new Set(["A","C"]));
  }
});
