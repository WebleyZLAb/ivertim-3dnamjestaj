import assert from "node:assert/strict";
import test from "node:test";
import { corpusAlignedBoardsToAnchor, corpusAppliedBoardAppearance, corpusBoardBounds, corpusBoardGroupBounds, corpusEvenlyDistributedBoards, corpusPlacedBoardsInElement, corpusSetBoardsVisibility, corpusTranslatedBoard, corpusTranslatedBoards } from "../lib/corpus-board-group.ts";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";

const element = parseCorpusE3d(`<ELEMENTFILE><ELEMENT ENAME="Korpus"><DASKE>
  <AD DNAME="A" DXPOS="0" DYPOS="10" DZPOS="20" />
  <AD DNAME="B" DXPOS="100" DYPOS="110" DZPOS="120" />
  <AD DNAME="C" DXPOS="200" DYPOS="210" DZPOS="220" />
</DASKE></ELEMENT></ELEMENTFILE>`).elements[0]!;

test("pomjera samo jedinstveno označene ploče po sve tri ose", () => {
  const moved = corpusTranslatedBoards(element, [2, 0, 2], [5, -10, 25]);
  assert.deepEqual(moved.boards.map((board) => board.position), [[5, 0, 45], [100, 110, 120], [205, 200, 245]]);
  assert.equal(moved.boards[1], element.boards[1]);
  assert.notEqual(moved.boards[0], element.boards[0]);
});

test("pomjera jednu aktivnu ploču bez promjene ostalih", () => {
  const moved = corpusTranslatedBoard(element, 1, [10, -5, 25]);
  assert.deepEqual(moved.boards.map((board) => board.position), [[0, 10, 20], [110, 105, 145], [200, 210, 220]]);
  assert.equal(moved.boards[0], element.boards[0]);
  assert.throws(() => corpusTranslatedBoard(element, 9, [10, 0, 0]), /Aktivna ploča/);
});

const shelves = parseCorpusE3d(`<ELEMENTFILE><ELEMENT ENAME="Police"><DASKE>
  <AD DNAME="Donja" DXPOS="0" DYPOS="0" DZPOS="0" VISINA="500" DUBINA="500" DEBLJINA="18" SMJER="2"/>
  <AD DNAME="Srednja" DXPOS="0" DYPOS="250" DZPOS="0" VISINA="500" DUBINA="500" DEBLJINA="18" SMJER="2"/>
  <AD DNAME="Gornja" DXPOS="0" DYPOS="582" DZPOS="0" VISINA="500" DUBINA="500" DEBLJINA="18" SMJER="2"/>
  <AD DNAME="Neoznačena" DXPOS="70" DYPOS="70" DZPOS="70" VISINA="100" DUBINA="100" DEBLJINA="10" SMJER="2"/>
</DASKE></ELEMENT></ELEMENTFILE>`).elements[0]!;

test("ravnomjerno raspoređuje ploče jednakim fizičkim razmakom i čuva krajnje", () => {
  const result = corpusEvenlyDistributedBoards(shelves, [2, 0, 1], "y");
  assert.equal(result.gap, 273);
  assert.deepEqual(result.element.boards.map((board) => board.position), [
    [0, 0, 0], [0, 291, 0], [0, 582, 0], [70, 70, 70],
  ]);
  assert.equal(result.element.boards[3], shelves.boards[3]);
});

test("raspodjela po Z poštuje obrnuti Corpus DZPOS zapis", () => {
  const source = { ...shelves, boards: shelves.boards.slice(0, 3).map((board, index) => ({ ...board, position: [0, 0, -index * 600] as const })) };
  const result = corpusEvenlyDistributedBoards(source, [0, 1, 2], "z");
  assert.deepEqual(result.element.boards.map((board) => board.position[2]), [0, -600, -1200]);
});

test("raspodjela odbija premali izbor, rotaciju i nedovoljan prostor", () => {
  assert.throws(() => corpusEvenlyDistributedBoards(shelves, [0, 1], "y"), /najmanje tri/);
  const rotated = { ...shelves, boards: shelves.boards.map((board, index) => index === 1 ? { ...board, angle: 5 } : board) };
  assert.throws(() => corpusEvenlyDistributedBoards(rotated, [0, 1, 2], "y"), /rotirane/);
  const crowded = { ...shelves, boards: shelves.boards.map((board, index) => index < 3 ? { ...board, position: [0, index * 5, 0] as const } : board) };
  assert.throws(() => corpusEvenlyDistributedBoards(crowded, [0, 1, 2], "y"), /dovoljno prostora/);
});

test("poravnava fizičke početke, centre i završetke prema prvoj označenoj ploči", () => {
  const mixed = parseCorpusE3d(`<ELEMENTFILE><ELEMENT><DASKE>
    <AD DNAME="Sidro" DXPOS="100" DYPOS="0" DZPOS="-50" VISINA="200" DUBINA="300" DEBLJINA="20" SMJER="2"/>
    <AD DNAME="Druga" DXPOS="400" DYPOS="80" DZPOS="-200" VISINA="100" DUBINA="150" DEBLJINA="10" SMJER="1"/>
    <AD DNAME="Treća" DXPOS="700" DYPOS="160" DZPOS="-350" VISINA="120" DUBINA="180" DEBLJINA="30" SMJER="0"/>
  </DASKE></ELEMENT></ELEMENTFILE>`).elements[0]!;
  const centeredX = corpusAlignedBoardsToAnchor(mixed, [0, 1, 2], "x", "center");
  assert.deepEqual(centeredX.boards.map((board) => board.position[0]), [100, 125, 185]);
  const maximumY = corpusAlignedBoardsToAnchor(mixed, [0, 1, 2], "y", "max");
  assert.deepEqual(maximumY.boards.map((board) => board.position[1]), [0, -80, -100]);
  const minimumZ = corpusAlignedBoardsToAnchor(mixed, [0, 1, 2], "z", "min");
  assert.deepEqual(minimumZ.boards.map((board) => board.position[2]), [-50, -50, -50]);
});

test("poravnanje odbija premali izbor i rotirane ploče", () => {
  assert.throws(() => corpusAlignedBoardsToAnchor(shelves, [0], "x", "min"), /najmanje dvije/);
  const rotated = { ...shelves, boards: shelves.boards.map((board, index) => index === 1 ? { ...board, zAngle: 15 } : board) };
  assert.throws(() => corpusAlignedBoardsToAnchor(rotated, [0, 1], "x", "center"), /rotirane/);
});

test("odbija premali, zastarjeli, nulti i nepotpun izbor", () => {
  assert.throws(() => corpusTranslatedBoards(element, [0], [5, 0, 0]), /najmanje dvije/);
  assert.throws(() => corpusTranslatedBoards(element, [0, 9], [5, 0, 0]), /važeći/);
  assert.throws(() => corpusTranslatedBoards(element, [0, 1], [0, 0, 0]), /različit/);
  assert.throws(() => corpusTranslatedBoards({ ...element, boards: [{ ...element.boards[0]!, position: [null, 0, 0] }, ...element.boards.slice(1)] }, [0, 1], [5, 0, 0]), /potpune/);
});

test("kopira samo izgled aktivne ploče na označene i čuva njihove proizvodne podatke", () => {
  const source = parseCorpusE3d(`<ELEMENTFILE><ELEMENT><DASKE>
    <AD DNAME="Izvor" MATNAME="Hrast" MATUID="uid-hrast" BOJA="9067058" PROZIRNO="true" VISIBLE="false" DXPOS="1"><BOHRUNGEN><B X="10"/></BOHRUNGEN></AD>
    <AD DNAME="Cilj" MATNAME="Bijela" BOJA="16777215" DXPOS="2"><UNKNOWN VALUE="ostaje"/></AD>
    <AD DNAME="Drugi cilj" MATNAME="Siva" BOJA="13421772" DXPOS="3"/>
    <AD DNAME="Netaknuta" MATNAME="Crna" BOJA="1118481" DXPOS="4"/>
  </DASKE></ELEMENT></ELEMENTFILE>`).elements[0]!;
  const applied = corpusAppliedBoardAppearance(source, [2, 1, 2], 0);
  for (const index of [1, 2]) {
    assert.deepEqual(
      [applied.boards[index]!.materialName, applied.boards[index]!.materialUid, applied.boards[index]!.color, applied.boards[index]!.transparent, applied.boards[index]!.visible],
      ["Hrast", "uid-hrast", 0x8a5a32, true, false],
    );
    assert.equal(applied.boards[index]!.position[0], index + 1);
  }
  assert.equal(applied.boards[1]!.unknownChildTags[0], "UNKNOWN");
  assert.equal(applied.boards[0], source.boards[0]);
  assert.equal(applied.boards[3], source.boards[3]);
});

test("grupna vidljivost mijenja samo označene ploče", () => {
  const hidden = corpusSetBoardsVisibility(element, [0, 2], false);
  assert.deepEqual(hidden.boards.map((board) => board.visible), [false, null, false]);
  assert.equal(hidden.boards[1], element.boards[1]);
  const shown = corpusSetBoardsVisibility(hidden, [0, 2], true);
  assert.deepEqual(shown.boards.map((board) => board.visible), [true, null, true]);
});

test("grupni izgled i vidljivost odbijaju nevažeće izbore", () => {
  assert.throws(() => corpusAppliedBoardAppearance(element, [0], 0), /najmanje dvije/);
  assert.throws(() => corpusAppliedBoardAppearance(element, [0, 1], 9), /Aktivna ploča/);
  assert.throws(() => corpusSetBoardsVisibility(element, [0, 9], false), /važeći/);
});

test("mjeri zajednički fizički omotač različito orijentisanih ploča", () => {
  const mixed = parseCorpusE3d(`<ELEMENTFILE><ELEMENT EW="800" EH="700" ED="600"><DASKE>
    <AD DNAME="Bočna" DXPOS="100" DYPOS="20" DZPOS="-50" VISINA="400" DUBINA="300" DEBLJINA="18" SMJER="0"/>
    <AD DNAME="Polica" DXPOS="250" DYPOS="200" DZPOS="-150" VISINA="200" DUBINA="350" DEBLJINA="20" SMJER="2"/>
    <AD DNAME="Netaknuta" DXPOS="0" DYPOS="0" DZPOS="0" VISINA="10" DUBINA="10" DEBLJINA="10" SMJER="1"/>
  </DASKE></ELEMENT></ELEMENTFILE>`).elements[0]!;
  assert.deepEqual(corpusBoardGroupBounds(mixed, [0, 1]), {
    minimum: [100, 20, 50], maximum: [450, 420, 500], size: [350, 400, 450],
  });
  assert.deepEqual(corpusBoardBounds(mixed, 0), {
    minimum: [100, 20, 50], maximum: [118, 420, 350], size: [18, 400, 300],
  });
  assert.throws(() => corpusBoardBounds(mixed, 9), /Aktivna ploča/);
});

test("postavlja cijelu grupu unutar elementa i čuva međusobni raspored", () => {
  const source = { ...shelves, width: 800, height: 700, depth: 600 };
  const centered = corpusPlacedBoardsInElement(source, [0, 1, 2], "y", "center", 10);
  assert.deepEqual(centered.bounds.minimum, [0, 50, 0]);
  assert.deepEqual(centered.bounds.maximum, [500, 650, 500]);
  assert.deepEqual(centered.element.boards.slice(0, 3).map((board) => board.position[1]), [50, 300, 632]);
  assert.equal(centered.element.boards[3], source.boards[3]);
  const atBack = corpusPlacedBoardsInElement(centered.element, [0, 1, 2], "z", "max", 20);
  assert.deepEqual(atBack.bounds.minimum, [0, 50, 80]);
  assert.deepEqual(atBack.element.boards.slice(0, 3).map((board) => board.position[2]), [-80, -80, -80]);
});

test("grupno postavljanje odbija rotaciju, loš omotač i preveliku grupu", () => {
  assert.throws(() => corpusPlacedBoardsInElement({ ...shelves, width: null }, [0, 1], "x", "min"), /potpun/);
  assert.throws(() => corpusPlacedBoardsInElement({ ...shelves, width: 100, height: 700, depth: 600 }, [0, 1], "x", "center"), /ne stanu/);
  const rotated = { ...shelves, width: 800, height: 700, depth: 600, boards: shelves.boards.map((board, index) => index === 1 ? { ...board, angle: 5 } : board) };
  assert.throws(() => corpusPlacedBoardsInElement(rotated, [0, 1], "y", "min"), /rotirane/);
});
