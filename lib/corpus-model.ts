import { parseCorpusE3d, type CorpusS3dBoard, type CorpusS3dElement, type CorpusS3dHole, type CorpusS3dRoom } from "./corpus-s3d.ts";

export type ElementGeometryPatch = Pick<CorpusS3dElement, "position" | "width" | "height" | "depth" | "angle"> & Partial<Pick<CorpusS3dElement, "xAngle" | "zAngle">>;
export type ElementIdentityPatch = Pick<CorpusS3dElement, "name" | "code" | "className" | "visible" | "editable" | "locked">;
export type BoardGeometryPatch = Pick<CorpusS3dBoard, "position" | "width" | "height" | "thickness" | "direction" | "angle" | "xAngle" | "zAngle">;
export type BoardAppearancePatch = Pick<CorpusS3dBoard, "materialName" | "materialUid" | "color" | "transparent" | "visible">;
export type BoardHolesPatch = readonly CorpusS3dHole[];
export type RoomGeometryPatch = CorpusS3dRoom;

export type CorpusGeometryChange = {
  path: number[];
  name: string;
  code: string;
  before: ElementGeometryPatch;
  after: ElementGeometryPatch;
};

export type CorpusBoardGeometryChange = {
  elementPath: number[];
  boardIndex: number;
  name: string;
  before: BoardGeometryPatch;
  after: BoardGeometryPatch;
};

export type CorpusElementIdentityChange = {
  path: number[];
  before: ElementIdentityPatch;
  after: ElementIdentityPatch;
};

export type CorpusBoardAppearanceChange = {
  elementPath: number[];
  boardIndex: number;
  name: string;
  before: BoardAppearancePatch;
  after: BoardAppearancePatch;
};

export type CorpusBoardHolesChange = {
  elementPath: number[];
  boardIndex: number;
  name: string;
  before: CorpusS3dHole[];
  after: CorpusS3dHole[];
};

export type CorpusImportedElementFile = {
  sourceFile: string;
  sourceXml: string;
};

export type CorpusWorkingCopyFile = {
  format: "ivertim-corpus-working-copy";
  version: 7;
  sourceFile: string;
  exportedAt: string;
  changes: CorpusGeometryChange[];
  boardChanges: CorpusBoardGeometryChange[];
  boardAppearanceChanges: CorpusBoardAppearanceChange[];
  boardHolesChanges: CorpusBoardHolesChange[];
  roomChange: { before: RoomGeometryPatch; after: RoomGeometryPatch } | null;
  elementIdentityChanges: CorpusElementIdentityChange[];
  imports: CorpusImportedElementFile[];
};

export function updateCorpusRoom(room: CorpusS3dRoom, patch: RoomGeometryPatch): CorpusS3dRoom {
  return { ...room, ...patch };
}

export function updateCorpusElement(
  elements: readonly CorpusS3dElement[],
  target: CorpusS3dElement,
  patch: ElementGeometryPatch,
): { elements: CorpusS3dElement[]; updated: CorpusS3dElement | null } {
  let updated: CorpusS3dElement | null = null;
  const visit = (items: readonly CorpusS3dElement[]): CorpusS3dElement[] => items.map((element) => {
    if (element === target) {
      updated = { ...element, ...patch };
      return updated;
    }
    const children = visit(element.children);
    return children.some((child, index) => child !== element.children[index]) ? { ...element, children } : element;
  });
  return { elements: visit(elements), updated };
}

export function updateCorpusElementIdentity(
  elements: readonly CorpusS3dElement[],
  target: CorpusS3dElement,
  patch: ElementIdentityPatch,
): { elements: CorpusS3dElement[]; updated: CorpusS3dElement | null } {
  return updateCorpusElementRecord(elements, target, { ...target, ...patch });
}

export function updateCorpusBoard(
  elements: readonly CorpusS3dElement[],
  targetElement: CorpusS3dElement,
  boardIndex: number,
  patch: BoardGeometryPatch,
): { elements: CorpusS3dElement[]; updatedElement: CorpusS3dElement | null } {
  const board = targetElement.boards[boardIndex];
  if (!board) return { elements: [...elements], updatedElement: null };
  const updatedBoard = { ...board, ...patch };
  const result = updateCorpusElementRecord(elements, targetElement, { ...targetElement, boards: targetElement.boards.map((item, index) => index === boardIndex ? updatedBoard : item) });
  return { elements: result.elements, updatedElement: result.updated };
}

export function updateCorpusBoardAppearance(
  elements: readonly CorpusS3dElement[],
  targetElement: CorpusS3dElement,
  boardIndex: number,
  patch: BoardAppearancePatch,
): { elements: CorpusS3dElement[]; updatedElement: CorpusS3dElement | null } {
  const board = targetElement.boards[boardIndex];
  if (!board) return { elements: [...elements], updatedElement: null };
  const updatedBoard = { ...board, ...patch };
  const result = updateCorpusElementRecord(elements, targetElement, { ...targetElement, boards: targetElement.boards.map((item, index) => index === boardIndex ? updatedBoard : item) });
  return { elements: result.elements, updatedElement: result.updated };
}

export function updateCorpusBoardHoles(
  elements: readonly CorpusS3dElement[],
  targetElement: CorpusS3dElement,
  boardIndex: number,
  holes: BoardHolesPatch,
): { elements: CorpusS3dElement[]; updatedElement: CorpusS3dElement | null } {
  const board = targetElement.boards[boardIndex];
  if (!board) return { elements: [...elements], updatedElement: null };
  const updatedBoard = { ...board, holes: holes.map(cloneHole), holeCount: holes.length };
  const result = updateCorpusElementRecord(elements, targetElement, { ...targetElement, boards: targetElement.boards.map((item, index) => index === boardIndex ? updatedBoard : item) });
  return { elements: result.elements, updatedElement: result.updated };
}

function updateCorpusElementRecord(
  elements: readonly CorpusS3dElement[],
  target: CorpusS3dElement,
  replacement: CorpusS3dElement,
): { elements: CorpusS3dElement[]; updated: CorpusS3dElement | null } {
  let updated: CorpusS3dElement | null = null;
  const visit = (items: readonly CorpusS3dElement[]): CorpusS3dElement[] => items.map((element) => {
    if (element === target) {
      updated = replacement;
      return replacement;
    }
    const children = visit(element.children);
    return children.some((child, index) => child !== element.children[index]) ? { ...element, children } : element;
  });
  return { elements: visit(elements), updated };
}

export function findCorpusElementPath(
  elements: readonly CorpusS3dElement[],
  target: CorpusS3dElement,
): number[] | null {
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index]!;
    if (element === target) return [index];
    const childPath = findCorpusElementPath(element.children, target);
    if (childPath) return [index, ...childPath];
  }
  return null;
}

export function corpusElementAtPath(elements: readonly CorpusS3dElement[], path: readonly number[]): CorpusS3dElement | null {
  let current = elements[path[0] ?? -1];
  if (!current) return null;
  for (let index = 1; index < path.length; index += 1) {
    current = current.children[path[index] ?? -1];
    if (!current) return null;
  }
  return current;
}

export function createCorpusWorkingCopyFile(
  sourceFile: string,
  original: readonly CorpusS3dElement[],
  current: readonly CorpusS3dElement[],
  exportedAt = new Date().toISOString(),
  rooms?: { original: CorpusS3dRoom; current: CorpusS3dRoom },
  imports: readonly CorpusImportedElementFile[] = [],
): CorpusWorkingCopyFile {
  const changes: CorpusGeometryChange[] = [];
  const boardChanges: CorpusBoardGeometryChange[] = [];
  const boardAppearanceChanges: CorpusBoardAppearanceChange[] = [];
  const boardHolesChanges: CorpusBoardHolesChange[] = [];
  const elementIdentityChanges: CorpusElementIdentityChange[] = [];

  const visit = (originalItems: readonly CorpusS3dElement[], currentItems: readonly CorpusS3dElement[], parentPath: number[]) => {
    for (let index = 0; index < Math.min(originalItems.length, currentItems.length); index += 1) {
      const beforeElement = originalItems[index]!;
      const afterElement = currentItems[index]!;
      const before = geometryOf(beforeElement);
      const after = geometryOf(afterElement);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changes.push({ path: [...parentPath, index], name: afterElement.name, code: afterElement.code, before, after });
      }
      const beforeIdentity = elementIdentityOf(beforeElement);
      const afterIdentity = elementIdentityOf(afterElement);
      if (JSON.stringify(beforeIdentity) !== JSON.stringify(afterIdentity)) {
        elementIdentityChanges.push({ path: [...parentPath, index], before: beforeIdentity, after: afterIdentity });
      }
      for (let boardIndex = 0; boardIndex < Math.min(beforeElement.boards.length, afterElement.boards.length); boardIndex += 1) {
        const beforeBoard = boardGeometryOf(beforeElement.boards[boardIndex]!);
        const afterBoard = boardGeometryOf(afterElement.boards[boardIndex]!);
        if (JSON.stringify(beforeBoard) !== JSON.stringify(afterBoard)) {
          boardChanges.push({ elementPath: [...parentPath, index], boardIndex, name: afterElement.boards[boardIndex]!.name, before: beforeBoard, after: afterBoard });
        }
        const beforeAppearance = boardAppearanceOf(beforeElement.boards[boardIndex]!);
        const afterAppearance = boardAppearanceOf(afterElement.boards[boardIndex]!);
        if (JSON.stringify(beforeAppearance) !== JSON.stringify(afterAppearance)) {
          boardAppearanceChanges.push({ elementPath: [...parentPath, index], boardIndex, name: afterElement.boards[boardIndex]!.name, before: beforeAppearance, after: afterAppearance });
        }
        const beforeHoles = beforeElement.boards[boardIndex]!.holes.map(cloneHole);
        const afterHoles = afterElement.boards[boardIndex]!.holes.map(cloneHole);
        if (JSON.stringify(beforeHoles) !== JSON.stringify(afterHoles)) {
          boardHolesChanges.push({ elementPath: [...parentPath, index], boardIndex, name: afterElement.boards[boardIndex]!.name, before: beforeHoles, after: afterHoles });
        }
      }
      visit(beforeElement.children, afterElement.children, [...parentPath, index]);
    }
  };

  visit(original, current, []);
  const roomChange = rooms && JSON.stringify(rooms.original) !== JSON.stringify(rooms.current)
    ? { before: { ...rooms.original }, after: { ...rooms.current } }
    : null;
  return { format: "ivertim-corpus-working-copy", version: 7, sourceFile, exportedAt, changes, boardChanges, boardAppearanceChanges, boardHolesChanges, roomChange, elementIdentityChanges, imports: imports.map((item) => ({ ...item })) };
}

export function applyCorpusWorkingCopyFile(
  sourceFile: string,
  elements: readonly CorpusS3dElement[],
  value: unknown,
): CorpusS3dElement[] {
  return applyCorpusWorkingCopyProject(sourceFile, elements, { width: null, length: null, height: null, lowerHeight: null }, value).elements;
}

export function applyCorpusWorkingCopyProject(
  sourceFile: string,
  elements: readonly CorpusS3dElement[],
  room: CorpusS3dRoom,
  value: unknown,
): { elements: CorpusS3dElement[]; room: CorpusS3dRoom; importedE3dSources: Array<{ sourceFile: string; sourceXml: string; originalElement: CorpusS3dElement }> } {
  if (!isWorkingCopyFile(value)) throw new Error("Fajl nije IVERTIM Corpus radna kopija podržane verzije (1–7).");
  if (value.sourceFile.toLocaleLowerCase() !== sourceFile.toLocaleLowerCase()) {
    throw new Error(`Radna kopija pripada projektu ${value.sourceFile}, a otvoren je ${sourceFile}.`);
  }

  let result = [...elements];
  for (const change of value.changes) {
    const target = corpusElementAtPath(result, change.path);
    if (!target) throw new Error(`Element na putanji ${change.path.join(".")} više ne postoji u projektu.`);
    if (target.name !== change.name || target.code !== change.code || JSON.stringify(geometryOf(target)) !== JSON.stringify(change.before)) {
      throw new Error(`Element ${change.path.join(".")} se razlikuje od projekta iz kojeg je radna kopija napravljena.`);
    }
    result = updateCorpusElement(result, target, change.after).elements;
  }
  for (const change of value.boardChanges ?? []) {
    const target = corpusElementAtPath(result, change.elementPath);
    const board = target?.boards[change.boardIndex];
    if (!target || !board) throw new Error(`Ploča ${change.elementPath.join(".")}:${change.boardIndex} više ne postoji u projektu.`);
    if (board.name !== change.name || JSON.stringify(boardGeometryOf(board)) !== JSON.stringify(change.before)) {
      throw new Error(`Ploča ${change.elementPath.join(".")}:${change.boardIndex} se razlikuje od projekta iz kojeg je radna kopija napravljena.`);
    }
    result = updateCorpusBoard(result, target, change.boardIndex, change.after).elements;
  }
  for (const change of value.boardAppearanceChanges ?? []) {
    const target = corpusElementAtPath(result, change.elementPath);
    const board = target?.boards[change.boardIndex];
    if (!target || !board) throw new Error(`Ploča ${change.elementPath.join(".")}:${change.boardIndex} više ne postoji u projektu.`);
    if (board.name !== change.name || JSON.stringify(boardAppearanceOf(board)) !== JSON.stringify(change.before)) {
      throw new Error(`Izgled ploče ${change.elementPath.join(".")}:${change.boardIndex} se razlikuje od izvornog projekta.`);
    }
    result = updateCorpusBoardAppearance(result, target, change.boardIndex, change.after).elements;
  }
  for (const change of value.boardHolesChanges ?? []) {
    const target = corpusElementAtPath(result, change.elementPath);
    const board = target?.boards[change.boardIndex];
    if (!target || !board) throw new Error(`Ploča ${change.elementPath.join(".")}:${change.boardIndex} više ne postoji u projektu.`);
    if (board.name !== change.name || JSON.stringify(board.holes) !== JSON.stringify(change.before)) {
      throw new Error(`Bušenja ploče ${change.elementPath.join(".")}:${change.boardIndex} razlikuju se od izvornog projekta.`);
    }
    result = updateCorpusBoardHoles(result, target, change.boardIndex, change.after).elements;
  }
  for (const change of value.elementIdentityChanges ?? []) {
    const target = corpusElementAtPath(result, change.path);
    if (!target) throw new Error(`Element na putanji ${change.path.join(".")} više ne postoji u projektu.`);
    if (JSON.stringify(elementIdentityOf(target)) !== JSON.stringify(change.before)) {
      throw new Error(`Identitet elementa ${change.path.join(".")} se razlikuje od izvornog projekta.`);
    }
    result = updateCorpusElementIdentity(result, target, change.after).elements;
  }
  let nextRoom = room;
  if (value.roomChange) {
    if (JSON.stringify(room) !== JSON.stringify(value.roomChange.before)) {
      throw new Error("Dimenzije prostorije se razlikuju od projekta iz kojeg je radna kopija napravljena.");
    }
    nextRoom = updateCorpusRoom(room, value.roomChange.after);
  }
  const importedE3dSources = (value.imports ?? []).map((item) => {
    const inspection = parseCorpusE3d(item.sourceXml);
    if (inspection.elements.length !== 1) throw new Error(`Uvezeni E3D ${item.sourceFile} mora sadržati tačno jedan korijenski element.`);
    const originalElement = inspection.elements[0]!;
    result.push(originalElement);
    return { ...item, originalElement };
  });
  return { elements: result, room: nextRoom, importedE3dSources };
}

type SupportedWorkingCopyFile = Omit<CorpusWorkingCopyFile, "version" | "boardChanges" | "boardAppearanceChanges" | "boardHolesChanges" | "roomChange" | "elementIdentityChanges" | "imports"> & { version: 1 | 2 | 3 | 4 | 5 | 6 | 7; boardChanges?: CorpusBoardGeometryChange[]; boardAppearanceChanges?: CorpusBoardAppearanceChange[]; boardHolesChanges?: CorpusBoardHolesChange[]; roomChange?: { before: RoomGeometryPatch; after: RoomGeometryPatch } | null; elementIdentityChanges?: CorpusElementIdentityChange[]; imports?: CorpusImportedElementFile[] };

function isWorkingCopyFile(value: unknown): value is SupportedWorkingCopyFile {
  if (!value || typeof value !== "object") return false;
  const file = value as Partial<SupportedWorkingCopyFile>;
  return file.format === "ivertim-corpus-working-copy"
    && (file.version === 1 || file.version === 2 || file.version === 3 || file.version === 4 || file.version === 5 || file.version === 6 || file.version === 7)
    && typeof file.sourceFile === "string"
    && Array.isArray(file.changes)
    && file.changes.every((change) => {
      if (!change || typeof change.name !== "string" || typeof change.code !== "string" || !Array.isArray(change.path) || !change.path.every((part) => Number.isInteger(part) && part >= 0)) return false;
      if (!isGeometryPatch(change.before)) return false;
      const after = change.after;
      return isGeometryPatch(after)
        && after.position.every((part) => typeof part === "number" && Number.isFinite(part))
        && [after.width, after.height, after.depth].every((part) => typeof part === "number" && Number.isFinite(part) && part > 0)
        && typeof after.angle === "number" && Number.isFinite(after.angle);
    })
    && (file.version === 1 || (Array.isArray(file.boardChanges) && file.boardChanges.every(isBoardChange)))
    && (file.version < 3 || (Array.isArray(file.boardAppearanceChanges) && file.boardAppearanceChanges.every(isBoardAppearanceChange)))
    && (file.version < 4 || file.roomChange === null || isRoomChange(file.roomChange))
    && (file.version < 5 || (Array.isArray(file.elementIdentityChanges) && file.elementIdentityChanges.every(isElementIdentityChange)))
    && (file.version < 6 || (Array.isArray(file.imports) && file.imports.every(isImportedElementFile)))
    && (file.version < 7 || (Array.isArray(file.boardHolesChanges) && file.boardHolesChanges.every(isBoardHolesChange)));
}

function isBoardHolesChange(change: unknown): change is CorpusBoardHolesChange {
  if (!change || typeof change !== "object") return false;
  const value = change as Partial<CorpusBoardHolesChange>;
  return Array.isArray(value.elementPath)
    && value.elementPath.every((part) => Number.isInteger(part) && part >= 0)
    && Number.isInteger(value.boardIndex) && value.boardIndex! >= 0
    && typeof value.name === "string"
    && Array.isArray(value.before) && value.before.every(isCorpusHole)
    && Array.isArray(value.after) && value.after.every(isCorpusHole);
}

function isCorpusHole(value: unknown): value is CorpusS3dHole {
  if (!value || typeof value !== "object") return false;
  const hole = value as Partial<CorpusS3dHole>;
  const nullableNumber = (part: unknown) => part === null || (typeof part === "number" && Number.isFinite(part));
  return typeof hole.groupType === "string" && /^GRUPA\d+$/i.test(hole.groupType)
    && typeof hole.name === "string"
    && typeof hole.xExpression === "string"
    && typeof hole.yExpression === "string"
    && [hole.diameter, hole.depth, hole.plane, hole.angle, hole.machiningMode].every(nullableNumber)
    && !!hole.machining && typeof hole.machining === "object"
    && Object.entries(hole.machining).every(([key, part]) => key.length > 0 && typeof part === "string");
}

function cloneHole(hole: CorpusS3dHole): CorpusS3dHole {
  return { ...hole, machining: { ...hole.machining } };
}

function isImportedElementFile(value: unknown): value is CorpusImportedElementFile {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CorpusImportedElementFile>;
  return typeof item.sourceFile === "string" && item.sourceFile.trim().length > 0
    && typeof item.sourceXml === "string" && item.sourceXml.trim().length > 0;
}

function isElementIdentityChange(change: unknown): change is CorpusElementIdentityChange {
  if (!change || typeof change !== "object") return false;
  const value = change as Partial<CorpusElementIdentityChange>;
  return Array.isArray(value.path)
    && value.path.every((part) => Number.isInteger(part) && part >= 0)
    && isElementIdentityPatch(value.before)
    && isElementIdentityPatch(value.after);
}

function isElementIdentityPatch(value: unknown): value is ElementIdentityPatch {
  if (!value || typeof value !== "object") return false;
  const identity = value as Partial<ElementIdentityPatch>;
  const nullableBoolean = (part: unknown) => part === null || typeof part === "boolean";
  return typeof identity.name === "string"
    && typeof identity.code === "string"
    && typeof identity.className === "string"
    && [identity.visible, identity.editable, identity.locked].every(nullableBoolean);
}

function isRoomChange(value: unknown): value is { before: RoomGeometryPatch; after: RoomGeometryPatch } {
  if (!value || typeof value !== "object") return false;
  const change = value as { before?: unknown; after?: unknown };
  return isRoomGeometryPatch(change.before) && isRoomGeometryPatch(change.after, true);
}

function isRoomGeometryPatch(value: unknown, requireUsableRoom = false): value is RoomGeometryPatch {
  if (!value || typeof value !== "object") return false;
  const room = value as Partial<RoomGeometryPatch>;
  const nullableNonNegative = (part: unknown) => part === null || (typeof part === "number" && Number.isFinite(part) && part >= 0);
  if (![room.width, room.length, room.height, room.lowerHeight].every(nullableNonNegative)) return false;
  if (!requireUsableRoom) return true;
  return typeof room.width === "number" && room.width > 0
    && typeof room.length === "number" && room.length > 0
    && typeof room.height === "number"
    && typeof room.lowerHeight === "number"
    && room.height + room.lowerHeight > 0;
}

function isBoardAppearanceChange(change: unknown): change is CorpusBoardAppearanceChange {
  if (!change || typeof change !== "object") return false;
  const value = change as Partial<CorpusBoardAppearanceChange>;
  return Array.isArray(value.elementPath)
    && value.elementPath.every((part) => Number.isInteger(part) && part >= 0)
    && Number.isInteger(value.boardIndex) && value.boardIndex! >= 0
    && typeof value.name === "string"
    && isBoardAppearancePatch(value.before)
    && isBoardAppearancePatch(value.after);
}

function isBoardAppearancePatch(value: unknown): value is BoardAppearancePatch {
  if (!value || typeof value !== "object") return false;
  const appearance = value as Partial<BoardAppearancePatch>;
  return typeof appearance.materialName === "string"
    && typeof appearance.materialUid === "string"
    && (appearance.color === null || (typeof appearance.color === "number" && Number.isInteger(appearance.color) && appearance.color >= 0 && appearance.color <= 0xffffff))
    && (appearance.transparent === null || typeof appearance.transparent === "boolean")
    && (appearance.visible === null || typeof appearance.visible === "boolean");
}

function isBoardChange(change: unknown): change is CorpusBoardGeometryChange {
  if (!change || typeof change !== "object") return false;
  const value = change as Partial<CorpusBoardGeometryChange>;
  return Array.isArray(value.elementPath)
    && value.elementPath.every((part) => Number.isInteger(part) && part >= 0)
    && Number.isInteger(value.boardIndex) && value.boardIndex! >= 0
    && typeof value.name === "string"
    && isBoardGeometryPatch(value.before)
    && isBoardGeometryPatch(value.after)
    && value.after.position.every((part) => typeof part === "number" && Number.isFinite(part))
    && [value.after.width, value.after.height, value.after.thickness].every((part) => typeof part === "number" && Number.isFinite(part) && part > 0)
    && [value.after.direction, value.after.angle, value.after.xAngle, value.after.zAngle].every((part) => typeof part === "number" && Number.isFinite(part));
}

function isGeometryPatch(value: unknown): value is ElementGeometryPatch {
  if (!value || typeof value !== "object") return false;
  const geometry = value as Partial<ElementGeometryPatch>;
  const nullableNumber = (part: unknown) => part === null || (typeof part === "number" && Number.isFinite(part));
  return Array.isArray(geometry.position)
    && geometry.position.length === 3
    && geometry.position.every(nullableNumber)
    && [geometry.width, geometry.height, geometry.depth, geometry.angle].every(nullableNumber)
    && (geometry.xAngle === undefined || nullableNumber(geometry.xAngle))
    && (geometry.zAngle === undefined || nullableNumber(geometry.zAngle));
}

function isBoardGeometryPatch(value: unknown): value is BoardGeometryPatch {
  if (!value || typeof value !== "object") return false;
  const geometry = value as Partial<BoardGeometryPatch>;
  const nullableNumber = (part: unknown) => part === null || (typeof part === "number" && Number.isFinite(part));
  return Array.isArray(geometry.position)
    && geometry.position.length === 3
    && geometry.position.every(nullableNumber)
    && [geometry.width, geometry.height, geometry.thickness, geometry.direction, geometry.angle, geometry.xAngle, geometry.zAngle].every(nullableNumber);
}

function geometryOf(element: CorpusS3dElement): ElementGeometryPatch {
  return {
    position: [...element.position],
    width: element.width,
    height: element.height,
    depth: element.depth,
    angle: element.angle,
    xAngle: element.xAngle,
    zAngle: element.zAngle,
  };
}

function boardGeometryOf(board: CorpusS3dBoard): BoardGeometryPatch {
  return {
    position: [...board.position], width: board.width, height: board.height, thickness: board.thickness,
    direction: board.direction, angle: board.angle, xAngle: board.xAngle, zAngle: board.zAngle,
  };
}

function boardAppearanceOf(board: CorpusS3dBoard): BoardAppearancePatch {
  return {
    materialName: board.materialName, materialUid: board.materialUid, color: board.color,
    transparent: board.transparent, visible: board.visible,
  };
}

function elementIdentityOf(element: CorpusS3dElement): ElementIdentityPatch {
  return {
    name: element.name, code: element.code, className: element.className,
    visible: element.visible, editable: element.editable, locked: element.locked,
  };
}
