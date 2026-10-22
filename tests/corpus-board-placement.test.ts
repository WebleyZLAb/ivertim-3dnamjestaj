import assert from "node:assert/strict";
import test from "node:test";
import { corpusAlignedBoardPosition, corpusEvenBoardPositions } from "../lib/corpus-board-placement.ts";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";

function fixture(board = `DXPOS="20" DYPOS="30" DZPOS="-40" VISINA="500" DUBINA="300" DEBLJINA="18" SMJER="2"`) {
  return parseCorpusE3d(`<ELEMENTFILE VER="17"><ELEMENT ENAME="E" ESIRINA="600" EVISINA="720" EDUBINA="560"><DASKE><AD DNAME="P" ${board}/></DASKE></ELEMENT></ELEMENTFILE>`).elements[0]!;
}

test("poravnava horizontalnu ploču po lokalnim X/Y/Z granicama", () => {
  const element = fixture();
  const board = element.boards[0]!;
  assert.deepEqual(corpusAlignedBoardPosition(element, board, "x", "min", 18), { ok: true, position: [18, 30, -40] });
  assert.deepEqual(corpusAlignedBoardPosition(element, board, "x", "max", 18), { ok: true, position: [82, 30, -40] });
  assert.deepEqual(corpusAlignedBoardPosition(element, board, "y", "center"), { ok: true, position: [20, 351, -40] });
  assert.deepEqual(corpusAlignedBoardPosition(element, board, "z", "min", 10), { ok: true, position: [20, 30, -10] });
  assert.deepEqual(corpusAlignedBoardPosition(element, board, "z", "max", 10), { ok: true, position: [20, 30, -250] });
});

test("koristi stvarne 3D mjere za sva tri Corpus smjera", () => {
  const side = fixture(`DXPOS="0" DYPOS="0" DZPOS="0" VISINA="700" DUBINA="500" DEBLJINA="18" SMJER="0"`);
  assert.deepEqual(corpusAlignedBoardPosition(side, side.boards[0]!, "x", "max"), { ok: true, position: [582, 0, 0] });
  const front = fixture(`DXPOS="0" DYPOS="0" DZPOS="0" VISINA="700" DUBINA="500" DEBLJINA="18" SMJER="1"`);
  assert.deepEqual(corpusAlignedBoardPosition(front, front.boards[0]!, "z", "max"), { ok: true, position: [0, 0, -542] });
});

test("odbija rotaciju, nepotpun omotač, negativan odmak i preveliku ploču", () => {
  const rotated = fixture(`DXPOS="0" DYPOS="0" DZPOS="0" VISINA="500" DUBINA="300" DEBLJINA="18" SMJER="2" DKUT="10"`);
  const rotatedResult = corpusAlignedBoardPosition(rotated, rotated.boards[0]!, "x", "min");
  assert.equal(rotatedResult.ok, false);
  if (!rotatedResult.ok) assert.match(rotatedResult.reason, /rotirane/);
  assert.equal(corpusAlignedBoardPosition(rotated, rotated.boards[0]!, "x", "min", -1).ok, false);
  const tooLarge = fixture(`DXPOS="0" DYPOS="0" DZPOS="0" VISINA="700" DUBINA="300" DEBLJINA="18" SMJER="2"`);
  assert.equal(corpusAlignedBoardPosition(tooLarge, tooLarge.boards[0]!, "x", "center").ok, false);
  const incomplete = { ...tooLarge, width: null };
  assert.equal(corpusAlignedBoardPosition(incomplete, incomplete.boards[0]!, "x", "min").ok, false);
});

test("ravnomjerno raspoređuje original i kopije između unutrašnjih granica", () => {
  const element = fixture();
  const board = element.boards[0]!;
  assert.deepEqual(corpusEvenBoardPositions(element, board, 4, "y", 18), {
    ok: true,
    positions: [[20, 18, -40], [20, 240, -40], [20, 462, -40], [20, 684, -40]],
    step: 222,
  });
  assert.deepEqual(corpusEvenBoardPositions(element, board, 3, "z", 10), {
    ok: true,
    positions: [[20, 30, -10], [20, 30, -130], [20, 30, -250]],
    step: 120,
  });
  assert.equal(corpusEvenBoardPositions(element, board, 1, "y").ok, false);
});
