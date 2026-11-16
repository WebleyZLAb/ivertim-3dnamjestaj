import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { flattenCorpusS3dElements, isCorpusHoleUsable, parseCorpusS3d } from "../lib/corpus-s3d.ts";
import { applyCorpusWorkingCopyProject, corpusElementAtPath, createCorpusWorkingCopyFile, findCorpusElementPath, updateCorpusBoard, updateCorpusBoardAppearance, updateCorpusBoardHoles, updateCorpusElement, updateCorpusElementIdentity, updateCorpusElementVariables, updateCorpusRoom } from "../lib/corpus-model.ts";
import { writeCorpusS3dGeometryCopy } from "../lib/corpus-s3d-writer.ts";
import { decodeCorpusTextDocument } from "../lib/corpus-text.ts";

const root = path.resolve(process.argv[2] ?? ".");
const files = await findS3dFiles(root);
const totals = {
  files: files.length,
  parsed: 0,
  failed: 0,
  elements: 0,
  boards: 0,
  visibleBoards: 0,
  holes: 0,
  invalidHoles: 0,
  filesWithInvalidHoles: 0,
  holesWithUnknownAttributes: 0,
  holesWithUnknownChildren: 0,
  curves: 0,
  approximateCurves: 0,
  machiningOperations: 0,
  macroLinks: 0,
  byteExactNoChangeWrites: 0,
  geometryWriteCandidates: 0,
  geometryWritesVerified: 0,
  boardWriteCandidates: 0,
  boardWritesVerified: 0,
  boardAppearanceWritesVerified: 0,
  holeWriteCandidates: 0,
  holeWritesVerified: 0,
  holeAddCandidates: 0,
  holeAddsVerified: 0,
  roomWriteCandidates: 0,
  roomWritesVerified: 0,
  elementIdentityWriteCandidates: 0,
  elementIdentityWritesVerified: 0,
  elementVariableWriteCandidates: 0,
  elementVariableWritesVerified: 0,
  recoveryCandidates: 0,
  recoveriesVerified: 0,
  unknownTopLevelTags: new Set<string>(),
  unknownElementTags: new Set<string>(),
  unknownBoardTags: new Set<string>(),
  directions: new Map<string, number>(),
  machiningModes: new Map<string, number>(),
  unknownHoleAttributes: new Map<string, number>(),
  unknownHoleAttributeValues: new Map<string, number>(),
};
const failures: Array<{ file: string; error: string }> = [];

for (const file of files) {
  try {
    const xml = decodeCorpusTextDocument(await readFile(file)).text;
    const project = parseCorpusS3d(xml);
    const elements = flattenCorpusS3dElements(project.elements);
    const boards = elements.flatMap((element) => element.boards);
    totals.parsed += 1;
    totals.elements += elements.length;
    totals.boards += boards.length;
    totals.visibleBoards += boards.filter((board) => board.visible !== false).length;
    totals.holes += boards.reduce((sum, board) => sum + board.holeCount, 0);
    const invalidHoles = boards.reduce((sum, board) => sum + board.invalidHoleCount, 0);
    totals.invalidHoles += invalidHoles;
    if (invalidHoles > 0) totals.filesWithInvalidHoles += 1;
    totals.curves += boards.filter((board) => board.curvePoints.length >= 3).length;
    totals.approximateCurves += boards.filter((board) => board.curveIsApproximate).length;
    totals.macroLinks += elements.reduce((sum, element) => sum + element.macroLinks.length, 0);
    for (const hole of boards.flatMap((board) => board.holes)) {
      if (Object.keys(hole.unknownAttributes ?? {}).length) totals.holesWithUnknownAttributes += 1;
      for (const [key, value] of Object.entries(hole.unknownAttributes ?? {})) {
        totals.unknownHoleAttributes.set(key, (totals.unknownHoleAttributes.get(key) ?? 0) + 1);
        const pair = `${key}=${value}`;
        totals.unknownHoleAttributeValues.set(pair, (totals.unknownHoleAttributeValues.get(pair) ?? 0) + 1);
      }
      if (hole.unknownChildTags?.length) totals.holesWithUnknownChildren += 1;
      if (hole.machiningMode === null && Object.keys(hole.machining).length === 0) continue;
      totals.machiningOperations += 1;
      const mode = String(hole.machiningMode);
      totals.machiningModes.set(mode, (totals.machiningModes.get(mode) ?? 0) + 1);
    }
    if (writeCorpusS3dGeometryCopy(xml, project.elements, project.elements) !== xml) {
      throw new Error("S3D writer je promijenio dokument bez izmjena.");
    }
    totals.byteExactNoChangeWrites += 1;

    if (project.room.width !== null && project.room.width > 0
      && project.room.length !== null && project.room.length > 0
      && project.room.height !== null && project.room.height >= 0
      && project.room.lowerHeight !== null && project.room.lowerHeight >= 0) {
      totals.roomWriteCandidates += 1;
      const expectedWidth = project.room.width + 0.001;
      const changedRoom = updateCorpusRoom(project.room, { ...project.room, width: expectedWidth });
      const written = writeCorpusS3dGeometryCopy(xml, project.elements, project.elements, {
        original: project.room,
        current: changedRoom,
      });
      const reparsed = parseCorpusS3d(written);
      if (reparsed.room.width !== expectedWidth) {
        throw new Error("S3D writer nije sačuvao probnu širinu prostorije.");
      }
      totals.roomWritesVerified += 1;
    }

    const candidate = elements.find((element) =>
      element.position.every((value) => value !== null)
      && element.width !== null && element.width > 0
      && element.height !== null && element.height > 0
      && element.depth !== null && element.depth > 0,
    );
    if (candidate) {
      totals.geometryWriteCandidates += 1;
      const path = findCorpusElementPath(project.elements, candidate)!;
      const expectedX = candidate.position[0]! + 0.001;
      const changed = updateCorpusElement(project.elements, candidate, {
        position: [expectedX, candidate.position[1]!, candidate.position[2]!],
        width: candidate.width!, height: candidate.height!, depth: candidate.depth!, angle: candidate.angle ?? 0,
        xAngle: candidate.xAngle ?? 0, zAngle: candidate.zAngle ?? 0,
      });
      const written = writeCorpusS3dGeometryCopy(xml, project.elements, changed.elements);
      const reparsed = parseCorpusS3d(written);
      if (corpusElementAtPath(reparsed.elements, path)?.position[0] !== expectedX) {
        throw new Error(`S3D writer nije sačuvao probnu geometriju elementa ${path.join(".")}.`);
      }
      totals.geometryWritesVerified += 1;
    }
    const identityCandidate = elements.find((element) => element.visible !== null && element.editable !== null && element.locked !== null);
    if (identityCandidate) {
      totals.elementIdentityWriteCandidates += 1;
      const elementPath = findCorpusElementPath(project.elements, identityCandidate)!;
      const expectedName = `${identityCandidate.name || "Element"} IVERTIM`;
      const changed = updateCorpusElementIdentity(project.elements, identityCandidate, {
        name: expectedName,
        code: identityCandidate.code,
        className: identityCandidate.className,
        visible: identityCandidate.visible,
        editable: identityCandidate.editable,
        locked: identityCandidate.locked,
      });
      const written = writeCorpusS3dGeometryCopy(xml, project.elements, changed.elements);
      const reparsed = parseCorpusS3d(written);
      if (corpusElementAtPath(reparsed.elements, elementPath)?.name !== expectedName) {
        throw new Error(`S3D writer nije sačuvao probni identitet elementa ${elementPath.join(".")}.`);
      }
      totals.elementIdentityWritesVerified += 1;
    }
    const variableCandidate = elements.find((element) => Object.keys(element.variables).length > 0);
    if (variableCandidate) {
      totals.elementVariableWriteCandidates += 1;
      const elementPath = findCorpusElementPath(project.elements, variableCandidate)!;
      const variableName = Object.keys(variableCandidate.variables)[0]!;
      const expectedVariables = { ...variableCandidate.variables, [variableName]: `(${variableCandidate.variables[variableName]})` };
      const changed = updateCorpusElementVariables(project.elements, variableCandidate, expectedVariables);
      const written = writeCorpusS3dGeometryCopy(xml, project.elements, changed.elements);
      const reparsedVariables = corpusElementAtPath(parseCorpusS3d(written).elements, elementPath)?.variables;
      if (JSON.stringify(Object.entries(reparsedVariables ?? {}).sort()) !== JSON.stringify(Object.entries(expectedVariables).sort())) {
        throw new Error(`S3D writer nije sačuvao probnu EVAR izmjenu elementa ${elementPath.join(".")}.`);
      }
      totals.elementVariableWritesVerified += 1;

      totals.recoveryCandidates += 1;
      const workingCopy = createCorpusWorkingCopyFile(path.basename(file), project.elements, changed.elements);
      const recovered = applyCorpusWorkingCopyProject(path.basename(file), project.elements, project.room, workingCopy);
      const recoveredVariables = corpusElementAtPath(recovered.elements, elementPath)?.variables;
      if (JSON.stringify(Object.entries(recoveredVariables ?? {}).sort()) !== JSON.stringify(Object.entries(expectedVariables).sort())) {
        throw new Error(`Radna kopija nije obnovila probnu EVAR izmjenu elementa ${elementPath.join(".")}.`);
      }
      totals.recoveriesVerified += 1;
    }
    const boardElement = elements.find((element) => element.boards.some((board) =>
      board.position.every((value) => value !== null)
      && board.width !== null && board.width > 0
      && board.height !== null && board.height > 0
      && board.thickness !== null && board.thickness > 0
      && board.direction !== null,
    ));
    if (boardElement) {
      const boardIndex = boardElement.boards.findIndex((board) => board.position.every((value) => value !== null)
        && board.width !== null && board.width > 0 && board.height !== null && board.height > 0
        && board.thickness !== null && board.thickness > 0 && board.direction !== null);
      const board = boardElement.boards[boardIndex]!;
      const elementPath = findCorpusElementPath(project.elements, boardElement)!;
      const expectedX = board.position[0]! + 0.001;
      totals.boardWriteCandidates += 1;
      const changed = updateCorpusBoard(project.elements, boardElement, boardIndex, {
        position: [expectedX, board.position[1]!, board.position[2]!], width: board.width!, height: board.height!, thickness: board.thickness!,
        direction: board.direction!, angle: board.angle ?? 0, xAngle: board.xAngle ?? 0, zAngle: board.zAngle ?? 0,
      });
      const written = writeCorpusS3dGeometryCopy(xml, project.elements, changed.elements);
      const reparsed = parseCorpusS3d(written);
      if (corpusElementAtPath(reparsed.elements, elementPath)?.boards[boardIndex]?.position[0] !== expectedX) {
        throw new Error(`S3D writer nije sačuvao probnu geometriju ploče ${elementPath.join(".")}:${boardIndex}.`);
      }
      totals.boardWritesVerified += 1;

      const appearanceColor = board.color === 0x123456 ? 0x654321 : 0x123456;
      const appearanceChanged = updateCorpusBoardAppearance(project.elements, boardElement, boardIndex, {
        materialName: board.materialName,
        materialUid: board.materialUid,
        color: appearanceColor,
        transparent: board.transparent ?? false,
        visible: board.visible ?? true,
      });
      const appearanceWritten = writeCorpusS3dGeometryCopy(xml, project.elements, appearanceChanged.elements);
      const appearanceReparsed = parseCorpusS3d(appearanceWritten);
      if (corpusElementAtPath(appearanceReparsed.elements, elementPath)?.boards[boardIndex]?.color !== appearanceColor) {
        throw new Error(`S3D writer nije sačuvao probni izgled ploče ${elementPath.join(".")}:${boardIndex}.`);
      }
      totals.boardAppearanceWritesVerified += 1;
    }

    const holeElement = elements.find((element) => element.boards.some((board) =>
      board.holes.some((hole) => isCorpusHoleUsable(hole) && !hole.unknownChildTags?.length),
    ));
    if (holeElement) {
      const boardIndex = holeElement.boards.findIndex((board) => board.holes.some((hole) => isCorpusHoleUsable(hole) && !hole.unknownChildTags?.length));
      const board = holeElement.boards[boardIndex]!;
      const holeIndex = board.holes.findIndex((hole) => isCorpusHoleUsable(hole) && !hole.unknownChildTags?.length);
      const hole = board.holes[holeIndex]!;
      const expectedName = `${hole.name || "Rupa"} IVERTIM`;
      const elementPath = findCorpusElementPath(project.elements, holeElement)!;
      totals.holeWriteCandidates += 1;
      const changed = updateCorpusBoardHoles(project.elements, holeElement, boardIndex,
        board.holes.map((item, index) => index === holeIndex ? { ...item, name: expectedName } : item));
      const written = writeCorpusS3dGeometryCopy(xml, project.elements, changed.elements);
      const reparsedBoard = corpusElementAtPath(parseCorpusS3d(written).elements, elementPath)?.boards[boardIndex];
      if (reparsedBoard?.holes[holeIndex]?.name !== expectedName) {
        throw new Error(`S3D writer nije sačuvao probni naziv rupe ${elementPath.join(".")}:${boardIndex}:${holeIndex}.`);
      }
      const originalUnknown = board.holes.map((item) => canonicalAttributes(item.unknownAttributes));
      const reparsedUnknown = reparsedBoard.holes.map((item) => canonicalAttributes(item.unknownAttributes));
      if (JSON.stringify(reparsedUnknown) !== JSON.stringify(originalUnknown)) {
        throw new Error(`S3D writer je promijenio nepoznate atribute rupa ${elementPath.join(".")}:${boardIndex}.`);
      }
      totals.holeWritesVerified += 1;

      totals.holeAddCandidates += 1;
      const addedHole = {
        groupType: hole.groupType,
        name: "IVERTIM audit rupa",
        xExpression: `(${hole.xExpression})+1`,
        yExpression: hole.yExpression,
        diameter: hole.diameter,
        depth: hole.depth,
        plane: hole.plane,
        angle: hole.angle,
        machiningMode: null,
        machining: {},
      };
      const added = updateCorpusBoardHoles(project.elements, holeElement, boardIndex, [...board.holes, addedHole]);
      const addedWritten = writeCorpusS3dGeometryCopy(xml, project.elements, added.elements);
      const addedBoard = corpusElementAtPath(parseCorpusS3d(addedWritten).elements, elementPath)?.boards[boardIndex];
      const addedAttributes = addedBoard?.holes.at(-1)?.unknownAttributes;
      if (JSON.stringify(canonicalAttributes(addedAttributes)) !== JSON.stringify(canonicalAttributes({ RCR: "0", RTLTR: "0", RZA: "0" }))) {
        throw new Error(`Nova rupa nije dobila dokazani kompatibilni minimum ${elementPath.join(".")}:${boardIndex}.`);
      }
      if (addedBoard?.holes.length !== board.holes.length + 1) {
        throw new Error(`S3D writer nije sačuvao probno dodanu rupu ${elementPath.join(".")}:${boardIndex}.`);
      }
      totals.holeAddsVerified += 1;
    }
    project.unknownTopLevelTags.forEach((tag) => totals.unknownTopLevelTags.add(tag));
    elements.flatMap((element) => element.unknownChildTags).forEach((tag) => totals.unknownElementTags.add(tag));
    boards.flatMap((board) => board.unknownChildTags).forEach((tag) => totals.unknownBoardTags.add(tag));
    for (const board of boards) {
      const key = String(board.direction);
      totals.directions.set(key, (totals.directions.get(key) ?? 0) + 1);
    }
  } catch (error) {
    totals.failed += 1;
    failures.push({ file, error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify({
  root,
  ...totals,
  directions: Object.fromEntries([...totals.directions.entries()].sort()),
  machiningModes: Object.fromEntries([...totals.machiningModes.entries()].sort()),
  unknownHoleAttributes: Object.fromEntries([...totals.unknownHoleAttributes.entries()].sort()),
  unknownHoleAttributeValues: Object.fromEntries([...totals.unknownHoleAttributeValues.entries()].sort()),
  unknownTopLevelTags: [...totals.unknownTopLevelTags].sort(),
  unknownElementTags: [...totals.unknownElementTags].sort(),
  unknownBoardTags: [...totals.unknownBoardTags].sort(),
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;

async function findS3dFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findS3dFiles(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".s3d")) result.push(fullPath);
  }
  return result.sort((left, right) => left.localeCompare(right));
}

function canonicalAttributes(attributes: Readonly<Record<string, string>> | undefined): Array<[string, string]> {
  return Object.entries(attributes ?? {}).sort(([left], [right]) => left.localeCompare(right));
}
