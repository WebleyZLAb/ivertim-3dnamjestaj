import type { CorpusCmkOperation, CorpusCmkOperationField } from "./corpus-cmk-simulation.ts";

export interface CorpusSawPath {
  section: string;
  name: string;
  count: number;
  start: readonly [number, number];
  end: readonly [number, number];
  depth: number;
  toolWidth: number;
  surface: number;
  modes: Readonly<Record<"PO" | "PS" | "PP" | "PA", number | null>>;
  routerConversion: { name: string | null; tool: number | null } | null;
}

export interface CorpusSawResolution {
  paths: readonly CorpusSawPath[];
  inactive: readonly string[];
  rejected: readonly { section: string; reason: string }[];
}

/**
 * Normalizuje samo numerički razriješenu PILA liniju. Značenje režimskih
 * polja ostaje sirovo dok se ne potvrdi ponašanjem Corpus/KDT lanca.
 */
export function resolveCorpusSawPaths(operations: readonly CorpusCmkOperation[]): CorpusSawResolution {
  const paths: CorpusSawPath[] = [];
  const inactive: string[] = [];
  const rejected: { section: string; reason: string }[] = [];
  for (const operation of operations.filter(({ kind }) => kind === "saw")) {
    const enabled = numeric(operation.fields, "J");
    const count = numeric(operation.fields, "GB");
    if (enabled === 0 || count === 0) {
      inactive.push(operation.section);
      continue;
    }
    if (enabled !== 1) {
      rejected.push({ section: operation.section, reason: "J mora biti dokazano 1; ostali režimi nisu protumačeni" });
      continue;
    }
    if (count !== 1) {
      rejected.push({ section: operation.section, reason: "Podržana je samo jedna PILA putanja (GB=1)" });
      continue;
    }
    const gx = numeric(operation.fields, "GX");
    const gy = numeric(operation.fields, "GY");
    const px = numeric(operation.fields, "PX");
    const py = numeric(operation.fields, "PY");
    const depth = numeric(operation.fields, "GD");
    const toolWidth = numeric(operation.fields, "PSP");
    const surface = numeric(operation.fields, "GS");
    if ([gx, gy, px, py, depth, toolWidth, surface].some((value) => value === null)) {
      rejected.push({ section: operation.section, reason: "Nisu razriješeni GX/GY, PX/PY, GD, PSP i GS" });
      continue;
    }
    if (depth! < 0 || toolWidth! <= 0 || !Number.isInteger(surface!) || surface! < 0 || surface! > 5) {
      rejected.push({ section: operation.section, reason: "Dubina, PSP širina ili GS ploha nisu u sigurnom numeričkom opsegu" });
      continue;
    }
    const conversionName = literal(operation.fields, "PMU");
    const conversionTool = numeric(operation.fields, "PMT");
    paths.push({
      section: operation.section,
      name: literal(operation.fields, "GN") ?? operation.section,
      count,
      start: [gx!, gy!], end: [px!, py!], depth: depth!, toolWidth: toolWidth!, surface: surface!,
      modes: { PO: numeric(operation.fields, "PO"), PS: numeric(operation.fields, "PS"), PP: numeric(operation.fields, "PP"), PA: numeric(operation.fields, "PA") },
      routerConversion: conversionName !== null || conversionTool !== null ? { name: conversionName, tool: conversionTool } : null,
    });
  }
  return { paths, inactive, rejected };
}

function field(fields: readonly CorpusCmkOperationField[], key: string): CorpusCmkOperationField | undefined {
  return fields.find((candidate) => candidate.key.toUpperCase() === key);
}

function numeric(fields: readonly CorpusCmkOperationField[], key: string): number | null {
  const value = field(fields, key)?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function literal(fields: readonly CorpusCmkOperationField[], key: string): string | null {
  const value = field(fields, key);
  if (!value) return null;
  if (typeof value.value === "string") return value.value;
  return value.literal;
}
