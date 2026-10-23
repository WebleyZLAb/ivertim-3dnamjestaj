import assert from "node:assert/strict";
import test from "node:test";
import { buildCorpusCutList, corpusCutListCsv } from "../lib/corpus-cutlist.ts";
import { generateCorpusCabinetE3d } from "../lib/corpus-generator.ts";
import { updateCorpusBoardAppearance, updateCorpusBoardHoles } from "../lib/corpus-model.ts";
import { parseCorpusE3d, parseCorpusS3d, type CorpusS3dHole } from "../lib/corpus-s3d.ts";
import { writeCorpusS3dWithImportedElements } from "../lib/corpus-s3d-writer.ts";
import { EMPTY_S3D } from "../src/demo-project.ts";

test("zatvara osnovni tok od prazne prostorije do ponovo učitane proizvodne S3D kopije", () => {
  const originalSource = EMPTY_S3D;
  const emptyProject = parseCorpusS3d(originalSource);
  const generated = generateCorpusCabinetE3d({
    name: "Donji korpus 600",
    code: "DK600",
    width: 600,
    height: 820,
    depth: 560,
    thickness: 18,
    shelfCount: 1,
    includeBack: true,
    materialName: "Bijela 18 mm",
    materialUid: "MAT-BIJELA-18",
    color: 0xf4f4f0,
    frontCount: 2,
    frontThickness: 18,
    frontGap: 2,
    frontMaterialName: "Hrast fronta",
    frontMaterialUid: "MAT-HRAST-FRONT",
    frontColor: 0x8b6542,
  });
  const generatedProject = parseCorpusE3d(generated.sourceXml);
  const originalElement = generatedProject.elements[0]!;
  const frontIndex = originalElement.boards.findIndex(({ name }) => name === "Fronta 1");
  assert.notEqual(frontIndex, -1);

  const appearance = updateCorpusBoardAppearance([originalElement], originalElement, frontIndex, {
    materialName: "Hrast natur fronta",
    materialUid: "MAT-HRAST-NATUR",
    color: 0x9c7651,
    transparent: false,
    visible: true,
  });
  const frontWithMaterial = appearance.updatedElement!;
  const handleHole: CorpusS3dHole = {
    groupType: "GRUPA14",
    name: "Ručkica lijevo",
    xExpression: "B/2-48",
    yExpression: "L-40",
    diameter: 5,
    depth: 12,
    plane: 1,
    angle: 90,
    machiningMode: null,
    machining: {},
  };
  const machining = updateCorpusBoardHoles(appearance.elements, frontWithMaterial, frontIndex, [handleHole]);
  const finishedElement = machining.updatedElement!;

  const exportedSource = writeCorpusS3dWithImportedElements(
    originalSource,
    emptyProject.elements,
    [finishedElement],
    [{ sourceFile: generated.fileName, sourceXml: generated.sourceXml, originalElement }],
  );
  const reopened = parseCorpusS3d(exportedSource);
  const reopenedElement = reopened.elements[0]!;
  const reopenedFront = reopenedElement.boards.find(({ name }) => name === "Fronta 1")!;
  const cutList = buildCorpusCutList(reopened.elements);

  assert.equal(originalSource, EMPTY_S3D, "izvorni prazni projekat ostaje netaknut");
  assert.deepEqual(reopened.room, emptyProject.room);
  assert.equal(reopenedElement.name, "Donji korpus 600");
  assert.equal(reopenedElement.boards.filter(({ name }) => name.startsWith("Fronta")).length, 2);
  assert.equal(reopenedFront.materialName, "Hrast natur fronta");
  assert.equal(reopenedFront.materialUid, "MAT-HRAST-NATUR");
  assert.equal(reopenedFront.boardType, 1);
  assert.equal(reopenedFront.frontType, 2);
  assert.equal(reopenedFront.holeCount, 1);
  assert.equal(reopenedFront.holes[0]?.xExpression, "B/2-48");
  assert.equal(cutList.totalBoards, reopenedElement.boards.length);
  assert.equal(cutList.skippedBoards, 0);
  assert.equal(cutList.items.reduce((sum, item) => sum + item.holeCount, 0), 1);
  assert.match(corpusCutListCsv(cutList), /Hrast natur fronta/);
  assert.match(exportedSource, /<PROJECTFILE/);
  assert.match(exportedSource, /DNAME="Fronta 1"/);
});
