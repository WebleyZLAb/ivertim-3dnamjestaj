import type { CorpusS3dHole } from "./corpus-s3d.ts";
import type { CorpusCmkOperation } from "./corpus-cmk-simulation.ts";

export type CorpusHolePatternAxis = "x" | "y";
export type CorpusHoleMirrorAxis = "x" | "y";

/**
 * Gradi obične Corpus rupe; rezultat nema posebnu IVERTIM strukturu koju
 * Corpus ne razumije. Svaka koordinata ostaje standardni RXP/RYP izraz.
 */
export function createCorpusLinearHolePattern(
  template: CorpusS3dHole,
  count: number,
  spacing: number,
  axis: CorpusHolePatternAxis,
): CorpusS3dHole[] {
  if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error("Broj rupa mora biti cijeli broj između 1 i 500.");
  if (!Number.isFinite(spacing) || spacing === 0) throw new Error("Razmak rupa mora biti broj različit od nule.");
  return Array.from({ length: count }, (_, index) => {
    const offset = index * spacing;
    return {
      ...template,
      name: count === 1 ? template.name : `${template.name} ${index + 1}`,
      xExpression: axis === "x" ? offsetExpression(template.xExpression, offset) : template.xExpression,
      yExpression: axis === "y" ? offsetExpression(template.yExpression, offset) : template.yExpression,
      machining: { ...template.machining },
    };
  });
}

export function createCorpusRectangularHolePattern(
  template: CorpusS3dHole,
  columns: number,
  rows: number,
  xSpacing: number,
  ySpacing: number,
): CorpusS3dHole[] {
  validateGridSize(columns, "Broj kolona");
  validateGridSize(rows, "Broj redova");
  if (!Number.isFinite(xSpacing) || (columns > 1 && xSpacing === 0)) throw new Error("X razmak mora biti broj različit od nule kada postoji više kolona.");
  if (!Number.isFinite(ySpacing) || (rows > 1 && ySpacing === 0)) throw new Error("Y razmak mora biti broj različit od nule kada postoji više redova.");
  if (columns * rows > 500) throw new Error("Mreža može sadržati najviše 500 rupa.");
  const result: CorpusS3dHole[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      result.push({
        ...template,
        name: columns === 1 && rows === 1 ? template.name : `${template.name} R${row + 1} K${column + 1}`,
        xExpression: offsetExpression(template.xExpression, column * xSpacing),
        yExpression: offsetExpression(template.yExpression, row * ySpacing),
        machining: { ...template.machining },
      });
    }
  }
  return result;
}

function validateGridSize(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 500) throw new Error(`${label} mora biti cijeli broj između 1 i 500.`);
}

export function mirrorCorpusHole(template: CorpusS3dHole, axis: CorpusHoleMirrorAxis): CorpusS3dHole {
  return {
    ...template,
    name: `${template.name} · ogledalo ${axis.toUpperCase()}`,
    xExpression: axis === "x" ? `B-(${template.xExpression})` : template.xExpression,
    yExpression: axis === "y" ? `L-(${template.yExpression})` : template.yExpression,
    machining: { ...template.machining },
  };
}

/** Kopira dokazanu glavnu plohu bez mijenjanja lokalnih RXP/RYP koordinata. */
export function oppositeCorpusHoleFace(template: CorpusS3dHole): CorpusS3dHole {
  if (template.plane !== 0 && template.plane !== 1) throw new Error("Samo RPL 0 i RPL 1 imaju dokazanu suprotnu glavnu plohu.");
  return {
    ...template,
    name: `${template.name} · suprotna ploha`,
    plane: template.plane === 0 ? 1 : 0,
    machining: { ...template.machining },
  };
}

export interface CorpusRasterHoleConversion {
  holes: readonly CorpusS3dHole[];
  rejected: readonly { section: string; reason: string }[];
}

/** Pretvara dokazani CMK RASTER: GP=0 napreduje po Y, GP=1 po X; ostali GP režimi ostaju blokirani. */
export function corpusRasterOperationsToHoles(operations: readonly CorpusCmkOperation[]): CorpusRasterHoleConversion {
  const holes: CorpusS3dHole[] = [];
  const rejected: Array<{ section: string; reason: string }> = [];
  for (const operation of operations.filter(({ kind }) => kind === "raster")) {
    const fields = Object.fromEntries(operation.fields.map((field) => [field.key.toUpperCase(), field]));
    const unresolved = operation.fields.filter(({ value, literal }) => value === null && literal === null);
    if (unresolved.length) {
      rejected.push({ section: operation.section, reason: `neriješena polja: ${unresolved.map(({ key }) => key).join(", ")}` });
      continue;
    }
    const count = numericField(fields.GB);
    if (count === 0) continue;
    if (count === null || !Number.isInteger(count) || count < 0 || count > 500) {
      rejected.push({ section: operation.section, reason: `GB=${count ?? "?"}; broj rupa mora biti cijeli broj između 0 i 500` });
      continue;
    }
    const depth = numericField(fields.GD);
    const diameter = numericField(fields.GF);
    const x = numericField(fields.GX);
    const y = numericField(fields.GY);
    const plane = numericField(fields.GS);
    const angle = numericField(fields.GK) ?? 0;
    const progression = numericField(fields.GP) ?? 0;
    const spacing = numericField(fields.GR) ?? 0;
    if ([depth, diameter, x, y, plane].some((value) => value === null)) {
      rejected.push({ section: operation.section, reason: "nedostaje numerički GD, GF, GX, GY ili GS" });
      continue;
    }
    if (count > 1 && progression !== 0 && progression !== 1) {
      rejected.push({ section: operation.section, reason: `GP=${progression}; podržani su dokazani smjerovi GP=0 (Y) i GP=1 (X)` });
      continue;
    }
    if (count > 1 && (!Number.isFinite(spacing) || spacing === 0)) {
      rejected.push({ section: operation.section, reason: "višestruki RASTER zahtijeva nenulti numerički GR razmak" });
      continue;
    }
    if (depth! <= 0 || diameter! <= 0) {
      rejected.push({ section: operation.section, reason: "GD i GF moraju biti veći od nule" });
      continue;
    }
    const nameField = fields.GN;
    const name = nameField?.literal ?? (nameField?.value === null || nameField?.value === undefined ? operation.section : String(nameField.value));
    for (let index = 0; index < count; index += 1) {
      holes.push({
        groupType: "GRUPA14", name: `${name} · ${operation.section}${count > 1 ? ` ${index + 1}` : ""}`,
        xExpression: String(x! + (progression === 1 ? spacing * index : 0)),
        yExpression: String(y! + (progression === 0 ? spacing * index : 0)),
        diameter, depth, plane, angle, machiningMode: null, machining: {},
      });
    }
  }
  return { holes, rejected };
}

function numericField(field: CorpusCmkOperation["fields"][number] | undefined): number | null {
  return typeof field?.value === "number" && Number.isFinite(field.value) ? field.value : null;
}

function offsetExpression(expression: string, offset: number): string {
  if (offset === 0) return expression;
  const sign = offset < 0 ? "-" : "+";
  return `(${expression})${sign}${Math.abs(offset)}`;
}
