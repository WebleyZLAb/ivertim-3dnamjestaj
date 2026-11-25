import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { handleSaveElementRequest, normalizeElementPath, saveLibraryElement, SAVE_ELEMENT_URL } from "../scripts/library-save.mjs";
// @ts-expect-error Lokalni JavaScript server nema zaseban declaration paket.
import { createCorpusServer } from "../scripts/serve-corpus.mjs";
import { elementFileName, libraryFolders } from "../lib/library-folders.ts";

const XML = '<?xml version="1.0"?><E3D><ELEMENT/></E3D>';

async function fakeRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "ivertim-lib-"));
  for (const base of ["public", "dist"]) {
    const dir = path.join(root, base, "local-corpus");
    await mkdir(path.join(dir, "Elmsav", "Kuhinja"), { recursive: true });
    await writeFile(path.join(dir, "manifest.json"), JSON.stringify({ elements: ["Elmsav/Kuhinja/A.E3D"], files: ["Elmsav/Kuhinja/A.E3D"] }));
    await writeFile(path.join(dir, "Elmsav", "Kuhinja", "A.E3D"), "<old/>");
  }
  return root;
}

test("putanja elementa mora ostati u folderu Elmsav i završavati na .E3D", () => {
  assert.equal(normalizeElementPath("Elmsav\\Kuhinja\\Novi.e3d"), "Elmsav/Kuhinja/Novi.e3d");
  for (const bad of ["../x.E3D", "Elmsav/../x.E3D", "Makro/x.E3D", "Elmsav/x.txt", "/etc/x.E3D", "Elmsav/a:b.E3D", "Elmsav/CON.E3D ", 5]) {
    assert.throws(() => normalizeElementPath(bad), Error, String(bad));
  }
});

test("novi element se upisuje u public i dist i dodaje u manifest bez dupliranja", async () => {
  const root = await fakeRoot();
  try {
    const result = await saveLibraryElement({ root, relativePath: "Elmsav/Moji/Novi.E3D", xml: XML, overwrite: false });
    assert.deepEqual(result, { path: "Elmsav/Moji/Novi.E3D", replaced: false });
    for (const base of ["public", "dist"]) {
      const dir = path.join(root, base, "local-corpus");
      assert.equal(await readFile(path.join(dir, "Elmsav", "Moji", "Novi.E3D"), "utf8"), XML);
      const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
      assert.deepEqual(manifest.elements, ["Elmsav/Kuhinja/A.E3D", "Elmsav/Moji/Novi.E3D"]);
      assert.deepEqual(manifest.files, ["Elmsav/Kuhinja/A.E3D", "Elmsav/Moji/Novi.E3D"]);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("postojeći element se ne prepisuje bez izričitog zahtjeva", async () => {
  const root = await fakeRoot();
  try {
    await assert.rejects(saveLibraryElement({ root, relativePath: "Elmsav/Kuhinja/A.E3D", xml: XML, overwrite: false }), { status: 409 });
    assert.equal(await readFile(path.join(root, "public", "local-corpus", "Elmsav", "Kuhinja", "A.E3D"), "utf8"), "<old/>");
    const result = await saveLibraryElement({ root, relativePath: "Elmsav/Kuhinja/A.E3D", xml: XML, overwrite: true });
    assert.equal(result.replaced, true);
    assert.equal(await readFile(path.join(root, "dist", "local-corpus", "Elmsav", "Kuhinja", "A.E3D"), "utf8"), XML);
    await assert.rejects(saveLibraryElement({ root, relativePath: "Elmsav/Kuhinja/B.E3D", xml: "nije xml", overwrite: false }), { status: 400 });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("pokretač prima upis samo iz istog izvora i samo kao JSON POST", async () => {
  const root = await fakeRoot();
  const server = createCorpusServer({ root });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Nema TCP adrese.");
  const base = `http://127.0.0.1:${address.port}`;
  const body = JSON.stringify({ path: "Elmsav/Moji/Server.E3D", xml: XML });
  const post = (headers: Record<string, string>) => fetch(base + SAVE_ELEMENT_URL, { method: "POST", headers, body });
  try {
    assert.equal((await post({ "Content-Type": "application/json" })).status, 403, "bez Origin zaglavlja");
    assert.equal((await post({ "Content-Type": "application/json", Origin: "http://evil.example" })).status, 403);
    assert.equal((await post({ "Content-Type": "text/plain", Origin: base })).status, 415);
    assert.equal((await fetch(base + SAVE_ELEMENT_URL)).status, 405);
    const ok = await post({ "Content-Type": "application/json", Origin: base });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { path: "Elmsav/Moji/Server.E3D", replaced: false });
    const escape = await fetch(base + SAVE_ELEMENT_URL, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ path: "Elmsav/../../x.E3D", xml: XML }) });
    assert.equal(escape.status, 400);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error: Error | undefined) => error ? reject(error) : resolve()));
    await rm(root, { recursive: true, force: true });
  }
});

test("dijalog izvodi foldere iz biblioteke i čisti naziv elementa", () => {
  assert.deepEqual(libraryFolders(["Elmsav/Kuhinja/Gornji/A.E3D", "Elmsav/Kupatilo/B.E3D", "elmtex/X.E3D"]), ["Elmsav", "Elmsav/Kuhinja", "Elmsav/Kuhinja/Gornji", "Elmsav/Kupatilo"]);
  assert.equal(elementFileName("  Ormar/1:2. "), "Ormar-1-2.E3D");
  assert.equal(elementFileName("Ormar.e3d"), "Ormar.E3D");
  assert.equal(elementFileName("  "), "");
});

// handleSaveElementRequest je izvezen i za Vite; ovdje samo potvrđujemo da ga modul nudi.
assert.equal(typeof handleSaveElementRequest, "function");
