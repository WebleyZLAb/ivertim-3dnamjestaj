import { evaluateCorpusAssignments, evaluateCorpusExpression, type CorpusExpressionValue } from "./corpus-expression.ts";
import type { CorpusCmkDocument, CorpusCmkEntry } from "./corpus-cmk.ts";
import type { CorpusS3dBoard, CorpusS3dElement } from "./corpus-s3d.ts";

export type CorpusCmkOperationKind = "raster" | "saw" | "consumable" | "macro" | "group";

export interface CorpusCmkOperationField {
  key: string;
  expression: string;
  value: CorpusExpressionValue | null;
  literal: string | null;
  dependencies: readonly string[];
}

export interface CorpusCmkOperation {
  section: string;
  kind: CorpusCmkOperationKind;
  fields: readonly CorpusCmkOperationField[];
}

export interface CorpusCmkSimulation {
  values: Readonly<Record<string, CorpusExpressionValue>>;
  unresolvedFormulaCount: number;
  operations: readonly CorpusCmkOperation[];
}

const OPERATION_SECTION = /^(RASTER|PILA|POTROSNI|MAKRO|GRUPA)\d+$/;
const TEXT_FIELD_KEYS = new Set(["GN", "NAME", "//"]);

/**
 * Simulira samo ograničenu aritmetiku CMK-a. Ne izvršava skripte, ne dodaje
 * rupe i ne nagađa Corpus runtime vrijednosti koje nisu dostupne u dokumentu.
 */
export function simulateCorpusCmk(
  document: CorpusCmkDocument,
  initialValues: Readonly<Record<string, CorpusExpressionValue>> = {},
): CorpusCmkSimulation {
  const formulaEntries = document.sections
    .filter(({ name }) => name === "VARIJABLE" || name === "FORMULE" || name === "JOINT")
    .flatMap(({ entries }) => entries)
    .filter(({ syntaxSupported }) => syntaxSupported)
    .map(({ key, value }) => ({ name: key, expression: value }));
  const resolved = evaluateCorpusAssignments(formulaEntries, initialValues);
  const operations = document.sections.flatMap((section): CorpusCmkOperation[] => {
    const match = OPERATION_SECTION.exec(section.name);
    if (!match) return [];
    return [{
      section: section.name,
      kind: operationKind(match[1]!),
      fields: section.entries.map((entry) => evaluateField(entry, resolved.values)),
    }];
  });
  return { values: resolved.values, unresolvedFormulaCount: resolved.unresolved.length, operations };
}

/** Gradi samo geometrijske vrijednosti koje su direktno dokazane S3D/E3D podacima. */
export function corpusMacroBoardContext(
  element: CorpusS3dElement,
  object1: CorpusS3dBoard | null,
  object2: CorpusS3dBoard | null,
): Record<string, CorpusExpressionValue> {
  const values: Record<string, CorpusExpressionValue> = {};
  addElementValues(values, element);
  if (object1) addBoardValues(values, "OBJ1", object1);
  if (object2) addBoardValues(values, "OBJ2", object2);
  const variableAssignments = Object.entries(element.variables).map(([name, expression]) => ({ name, expression }));
  return evaluateCorpusAssignments(variableAssignments, values).values;
}

function addElementValues(values: Record<string, CorpusExpressionValue>, element: CorpusS3dElement) {
  const [x, y, z] = element.position;
  addNumber(values, "X", x);
  addNumber(values, "Y", y);
  addNumber(values, "Z", z);
  addNumber(values, "V", element.height);
  addNumber(values, "S", element.width);
  addNumber(values, "D", element.depth);
  addNumber(values, "SIRINA", element.width);
  addNumber(values, "VISINA", element.height);
  addNumber(values, "DUBINA", element.depth);
}

function addBoardValues(values: Record<string, CorpusExpressionValue>, prefix: string, board: CorpusS3dBoard) {
  const [x, y, z] = board.position;
  addNumber(values, `${prefix}.X`, x);
  addNumber(values, `${prefix}.Y`, y);
  addNumber(values, `${prefix}.Z`, z);
  addNumber(values, `${prefix}.V`, board.height);
  addNumber(values, `${prefix}.S`, board.width);
  addNumber(values, `${prefix}.D`, board.width);
  addNumber(values, `${prefix}.DE`, board.thickness);
  addNumber(values, `${prefix}.GR`, board.thickness);
  addNumber(values, `${prefix}.SMJER`, board.direction);
  const bounds = boardLocalBounds(board);
  if (bounds) {
    addNumber(values, `${prefix}.MINX`, bounds.minX);
    addNumber(values, `${prefix}.MAXX`, bounds.maxX);
    addNumber(values, `${prefix}.MINY`, bounds.minY);
    addNumber(values, `${prefix}.MAXY`, bounds.maxY);
  }
}

/**
 * Corpusova radna ravan ploče koristi X/Z tačke konture kao makro X/Y.
 * Kada kontura nije zapisana, pravougaona ploča počinje u 0,0 i završava na
 * VISINA,DUBINA. Ne izvodimo granice iz 3D položaja niti iz druge ploče.
 */
function boardLocalBounds(board: CorpusS3dBoard) {
  if (board.curvePoints.length > 0) {
    const xs = board.curvePoints.map(({ x }) => x).filter(Number.isFinite);
    const ys = board.curvePoints.map(({ z }) => z).filter(Number.isFinite);
    if (xs.length && ys.length) return {
      minX: Math.min(...xs), maxX: Math.max(...xs),
      minY: Math.min(...ys), maxY: Math.max(...ys),
    };
  }
  if (board.height === null || board.width === null) return null;
  return { minX: 0, maxX: board.height, minY: 0, maxY: board.width };
}

function addNumber(values: Record<string, CorpusExpressionValue>, key: string, value: number | null) {
  if (value !== null && Number.isFinite(value)) values[key] = value;
}

function evaluateField(entry: CorpusCmkEntry, values: Readonly<Record<string, CorpusExpressionValue>>): CorpusCmkOperationField {
  const value = entry.syntaxSupported ? evaluateCorpusExpression(entry.value, values) : null;
  const literal = value === null && TEXT_FIELD_KEYS.has(entry.key.toUpperCase()) ? entry.value : null;
  return { key: entry.key, expression: entry.value, value, literal, dependencies: entry.dependencies };
}

function operationKind(prefix: string): CorpusCmkOperationKind {
  if (prefix === "RASTER") return "raster";
  if (prefix === "PILA") return "saw";
  if (prefix === "POTROSNI") return "consumable";
  if (prefix === "MAKRO") return "macro";
  return "group";
}
