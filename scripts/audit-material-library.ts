import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  createCorpusMaterialIndex, matchCorpusMaterial, parseCorpusMaterialCatalog,
  resolveCorpusMaterialPicturePath,
} from "../lib/corpus-material-library.ts";
import { flattenCorpusS3dElements, parseCorpusE3d, parseCorpusS3d } from "../lib/corpus-s3d.ts";

const documentRoot = path.resolve(process.argv[2] ?? ".");
const textureRoot = path.resolve(process.argv[3] ?? ".");
const catalogFiles = (await findFiles(textureRoot)).filter((file) => /^matdat\.(?:mxc|k3x)$/i.test(path.basename(file)));
const catalogs = [];
const catalogFailures: Array<{ file: string; error: string }> = [];
for (const file of catalogFiles) {
  try {
    catalogs.push(parseCorpusMaterialCatalog(await readFile(file, "utf8"), slash(path.relative(textureRoot, file))));
  } catch (reason) {
    catalogFailures.push({ file: path.relative(textureRoot, file), error: reason instanceof Error ? reason.message : String(reason) });
  }
}
const index = createCorpusMaterialIndex(catalogs);
const documentFiles = (await findFiles(documentRoot)).filter((file) => /\.(?:s3d|e3d)$/i.test(file));
const matches = { uid: 0, uidAmbiguous: 0, name: 0, nameAmbiguous: 0, missing: 0 };
const pictures = { validPath: 0, existing: 0, missing: 0, unsafe: 0 };
const examples = { uidAmbiguous: [] as object[], name: [] as object[], nameAmbiguous: [] as object[], missing: [] as object[] };
const documentFailures: Array<{ file: string; error: string }> = [];
let boards = 0;
for (const file of documentFiles) {
  try {
    const xml = await readFile(file, "utf8");
    const inspection = file.toLowerCase().endsWith(".e3d") ? parseCorpusE3d(xml) : parseCorpusS3d(xml);
    for (const element of flattenCorpusS3dElements(inspection.elements)) for (const board of element.boards) {
      boards += 1;
      const match = matchCorpusMaterial(index, board.materialUid, board.materialName);
      const sample = { file: slash(path.relative(documentRoot, file)), uid: board.materialUid, name: board.materialName };
      if (match.kind === "uid") {
        matches.uid += 1;
        const resolved = resolveCorpusMaterialPicturePath(match.record.sourceCatalog, match.record.pictureFile);
        if (!resolved.ok) pictures.unsafe += 1;
        else {
          pictures.validPath += 1;
          try { await access(path.join(textureRoot, ...resolved.relativePath.split("/"))); pictures.existing += 1; }
          catch { pictures.missing += 1; }
        }
      } else if (match.kind === "uid-ambiguous") { matches.uidAmbiguous += 1; push(examples.uidAmbiguous, { ...sample, candidates: match.candidates.length }); }
      else if (match.kind === "name") { matches.name += 1; push(examples.name, { ...sample, candidate: match.record.sourceCatalog }); }
      else if (match.kind === "name-ambiguous") { matches.nameAmbiguous += 1; push(examples.nameAmbiguous, { ...sample, candidates: match.candidates.length }); }
      else { matches.missing += 1; push(examples.missing, sample); }
    }
  } catch (reason) {
    documentFailures.push({ file: path.relative(documentRoot, file), error: reason instanceof Error ? reason.message : String(reason) });
  }
}

console.log(JSON.stringify({
  documentRoot, textureRoot, catalogFiles: catalogFiles.length, catalogsParsed: catalogs.length,
  catalogRecords: catalogs.reduce((sum, catalog) => sum + catalog.records.length, 0),
  catalogWarnings: catalogs.flatMap((catalog) => catalog.warnings.map((warning) => ({ catalog: catalog.sourceCatalog, warning }))).slice(0, 100),
  catalogFailures, documentFiles: documentFiles.length, documentFailures, boards, matches, pictures, examples,
}, null, 2));

async function findFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findFiles(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}
function slash(value: string) { return value.split(path.sep).join("/"); }
function push(values: object[], value: object) { if (values.length < 20) values.push(value); }
