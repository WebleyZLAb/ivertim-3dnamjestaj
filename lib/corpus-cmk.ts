import { analyzeCorpusMacroPayload } from "./corpus-macro.ts";

export interface CorpusCmkEntry {
  key: string;
  value: string;
  line: number;
  syntaxSupported: boolean;
  dependencies: readonly string[];
}

export interface CorpusCmkSection {
  name: string;
  entries: readonly CorpusCmkEntry[];
}

export interface CorpusCmkDocument {
  sections: readonly CorpusCmkSection[];
  unparsedLines: readonly { line: number; content: string }[];
}

/** Čita izvorni tekstualni CMK format i čuva redoslijed i duplikate ključeva. */
export function parseCorpusCmk(text: string): CorpusCmkDocument {
  const sections: { name: string; entries: CorpusCmkEntry[] }[] = [];
  const unparsedLines: { line: number; content: string }[] = [];
  let current: { name: string; entries: CorpusCmkEntry[] } | null = null;
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]!;
    const content = raw.trim();
    if (!content || content.startsWith("//") || content.startsWith(";") || content.startsWith("#")) continue;
    const header = /^\[([^\]]+)]$/.exec(content);
    if (header) {
      current = { name: header[1]!.trim().toUpperCase(), entries: [] };
      sections.push(current);
      continue;
    }
    const equals = content.indexOf("=");
    if (!current || equals <= 0) {
      unparsedLines.push({ line: index + 1, content: raw });
      continue;
    }
    const key = content.slice(0, equals).trim();
    const value = content.slice(equals + 1).trim();
    const analysis = analyzeCorpusMacroPayload(`${key}=${value}`).assignments[0];
    current.entries.push({
      key,
      value,
      line: index + 1,
      syntaxSupported: analysis?.syntaxSupported ?? false,
      dependencies: analysis?.dependencies ?? [],
    });
  }
  return { sections, unparsedLines };
}

const EMBEDDED_SECTION_NAMES: Readonly<Record<string, string>> = {
  MSVA: "VARIJABLE",
  MSJO: "JOINT",
  MSFO: "FORMULE",
  MSRA: "RASTER",
  MSPO: "POTROSNI",
  MSPI: "PILA",
  MSMA: "MAKRO",
  MSGR: "GRUPA",
  MSPOCK: "MSPOCK",
};

/** Pretvara već lokalno dekompresovane MM1/MM2 C6DAT blokove u CMK model. */
export function corpusCmkDocumentFromDecodedPayloads(
  payloads: Readonly<Record<string, readonly string[]>>,
): CorpusCmkDocument {
  const counters = new Map<string, number>();
  const sections: CorpusCmkSection[] = [];
  for (const [code, values] of Object.entries(payloads)) {
    const baseName = EMBEDDED_SECTION_NAMES[code] ?? code;
    for (const content of values) {
      const repeated = ["RASTER", "POTROSNI", "PILA", "MAKRO", "GRUPA", "MSPOCK"].includes(baseName);
      const number = (counters.get(baseName) ?? 0) + 1;
      counters.set(baseName, number);
      const analysis = analyzeCorpusMacroPayload(content);
      sections.push({
        name: repeated ? `${baseName}${number}` : baseName,
        entries: analysis.assignments.map((assignment, index) => ({
          key: assignment.name,
          value: assignment.expression,
          line: index + 1,
          syntaxSupported: assignment.syntaxSupported,
          dependencies: assignment.dependencies,
        })),
      });
    }
  }
  return { sections, unparsedLines: [] };
}
