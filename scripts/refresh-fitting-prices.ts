// Upisuje cijene okova (fittingPrices) u manifest lokalne biblioteke iz Potrosni/*.cxm.
// Pokretanje: node --experimental-strip-types scripts/refresh-fitting-prices.ts [public|dist]...
import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseFittingPrices } from "../lib/corpus-fitting-prices.ts";

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ["public", "dist"];
for (const base of targets) {
  const library = path.resolve(base, "local-corpus");
  const manifestPath = path.join(library, "manifest.json");
  let manifest: Record<string, unknown>;
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch { console.log(`${base}: nema manifesta`); continue; }
  const prices: Record<string, number> = {};
  const folder = path.join(library, "Potrosni");
  for (const name of (await readdir(folder)).filter((file) => /\.cxm$/i.test(file))) {
    Object.assign(prices, parseFittingPrices(await readFile(path.join(folder, name), "utf8")));
  }
  manifest["fittingPrices"] = prices;
  // Upis preko privremene datoteke: prekid usred upisa ne smije ostaviti oštećen manifest.
  await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest));
  await rename(`${manifestPath}.tmp`, manifestPath);
  console.log(`${base}: ${Object.keys(prices).length} okova sa cijenom`);
}
