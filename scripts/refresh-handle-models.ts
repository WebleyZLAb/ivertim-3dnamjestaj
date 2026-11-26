/**
 * Pravi mapu "ručka iz biblioteke → 3D model" i kopira modele ručki u lokalnu biblioteku.
 *
 *   node --experimental-strip-types scripts/refresh-handle-models.ts [CorpusSolutions folder] [folderi ručki, zarez: Handles,_RUCKICE,HRANIPEX_HANDLES]
 *
 * Ručka u biblioteci (`Elmsav/Handles/**.e3d`, `_RUCKICE`, `HRANIPEX_HANDLES`) nosi okov iz kataloga (`POTITEM`, UID i naziv);
 * katalog (`Potrosni/*.cxm`) daje putanju modela (`DPKSEXTRA`), a model je u `Modeli`. Rezultat: `public/local-corpus/handle-models.json`
 * i kopije modela u `public/local-corpus/Modeli/…`. Izvorni Corpus fajlovi se ne mijenjaju; `public/local-corpus` je privatan i izvan gita.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseFittingCatalog } from "../lib/corpus-fitting-model.ts";

const corpus = process.argv[2] ?? "C:/CorpusSoftware64/CorpusSolutions";
const target = join(process.cwd(), "public", "local-corpus");
const library = join(target, "Elmsav");

const catalogs = readdirSync(join(corpus, "Potrosni")).filter((name) => /\.cxm$/i.test(name));
const byUid = new Map<string, string | null>();
const byName = new Map<string, string | null>();
for (const name of catalogs) {
  for (const item of parseFittingCatalog(readFileSync(join(corpus, "Potrosni", name), "utf-8"))) {
    if (!item.modelPath) continue;
    if (item.uid) byUid.set(item.uid.toUpperCase(), item.modelPath);
    if (!byName.has(item.name)) byName.set(item.name, item.modelPath);
  }
}

const folders = (process.argv[3] ?? "Handles").split(",");
const map: Record<string, string> = {};
const models = new Set<string>();
let handles = 0;
const scan = (directory: string) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) { scan(path); continue; }
    if (!/\.e3d$/i.test(entry)) continue;
    handles += 1;
    const text = readFileSync(path, "latin1");
    for (const match of text.matchAll(/<POTITEM ([^>]*)\/?>/g)) {
      const attributes = match[1]!;
      if (!/\bTIP="1"/.test(attributes)) continue;
      const uid = /UID="([^"]*)"/.exec(attributes)?.[1] ?? "";
      const name = /NAZIV="([^"]*)"/.exec(attributes)?.[1] ?? "";
      const model = byUid.get(uid.toUpperCase()) ?? byName.get(name);
      if (!model || !/\.dae$/i.test(model)) continue;
      map[path.slice(target.length + 1).replace(/\\/g, "/")] = model;
      models.add(model);
      break;
    }
  }
};
for (const folder of folders) if (existsSync(join(library, folder))) scan(join(library, folder));

let copied = 0, missing = 0;
for (const model of models) {
  const source = join(corpus, "Modeli", model), destination = join(target, "Modeli", model);
  if (!existsSync(source)) { missing += 1; continue; }
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
  copied += 1;
}
writeFileSync(join(target, "handle-models.json"), JSON.stringify({ version: 1, models: map }, null, 1));
console.log(`E3D ručki: ${handles}, s modelom: ${Object.keys(map).length}, različitih modela: ${models.size}, kopirano: ${copied}, nedostaje: ${missing}`);
